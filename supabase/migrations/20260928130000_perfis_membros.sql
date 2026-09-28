-- =====================================================================
-- Prompt 2 · Perfis e membros
-- =====================================================================

-- O histórico é uma trilha de auditoria imutável: ele guarda os ids mesmo
-- depois que o post/perfil for excluído. Sem FK, uma exclusão não tenta
-- fazer UPDATE (set null) no histórico — o que o trigger bloquearia.
alter table public.historico drop constraint if exists historico_post_id_fkey;
alter table public.historico drop constraint if exists historico_perfil_id_fkey;
alter table public.historico drop constraint if exists historico_autor_id_fkey;

-- Decisões/comentários/versões podem ser apagados SOMENTE pela exclusão
-- definitiva de um perfil (função abaixo), nunca diretamente.
create or replace function public.bloquear_alteracao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Durante a exclusão definitiva, as cascatas (delete / set null) passam.
  if current_setting('adere.exclusao_definitiva', true) = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  raise exception 'Registros de % não podem ser alterados nem apagados.', tg_table_name
    using errcode = '42501';
end;
$$;

create trigger post_versoes_imutaveis before update or delete on public.post_versoes
  for each row execute function public.bloquear_alteracao();
create trigger comentarios_imutaveis before update or delete on public.comentarios
  for each row execute function public.bloquear_alteracao();

-- Contagem de posts por perfil (tabela de Configurações e página do perfil).
create or replace view public.perfis_resumo
with (security_invoker = true)
as
select
  p.id as perfil_id,
  count(po.id)::int as total_posts,
  count(po.id) filter (where po.status = 'aguardando')::int as aguardando
from public.perfis p
left join public.posts po on po.perfil_id = p.id
group by p.id;

grant select on public.perfis_resumo to authenticated;

-- Exclusão definitiva de um perfil com posts (exige digitar o nome).
-- Devolve os caminhos de arquivos do Storage para o servidor apagar.
create or replace function public.excluir_perfil_definitivo(p_perfil_id uuid, p_confirmacao text)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text;
  v_caminhos text[];
begin
  if not public.is_admin() then
    raise exception 'Somente o administrador pode excluir perfis.' using errcode = '42501';
  end if;

  select nome into v_nome from public.perfis where id = p_perfil_id;
  if v_nome is null then
    raise exception 'Perfil não encontrado.' using errcode = 'P0002';
  end if;
  if trim(coalesce(p_confirmacao, '')) <> trim(v_nome) then
    raise exception 'Digite exatamente o nome do perfil para confirmar.' using errcode = '22023';
  end if;

  select coalesce(array_agg(m.storage_path), '{}')
    into v_caminhos
    from public.midias m
    join public.posts po on po.id = m.post_id
   where po.perfil_id = p_perfil_id and m.storage_path is not null;

  select v_caminhos || coalesce(array_agg(avatar_url), '{}')
    into v_caminhos
    from public.perfis where id = p_perfil_id and avatar_url is not null;

  insert into public.historico (entidade, entidade_id, perfil_id, acao, autor_id, detalhes)
  values ('perfil', p_perfil_id, p_perfil_id, 'excluiu_definitivo', auth.uid(),
          jsonb_build_object('nome', v_nome,
                             'posts', (select count(*) from public.posts where perfil_id = p_perfil_id)));

  perform set_config('adere.exclusao_definitiva', 'on', true);
  delete from public.posts where perfil_id = p_perfil_id;
  delete from public.perfis where id = p_perfil_id;
  perform set_config('adere.exclusao_definitiva', 'off', true);

  return v_caminhos;
end;
$$;

revoke execute on function public.excluir_perfil_definitivo(uuid, text) from public, anon;
grant execute on function public.excluir_perfil_definitivo(uuid, text) to authenticated;

-- Reordenação da sidebar em uma chamada.
create or replace function public.reordenar_perfis(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Somente o administrador pode reordenar perfis.' using errcode = '42501';
  end if;
  update public.perfis p
     set ordem = x.ordem
    from unnest(p_ids) with ordinality as x(id, ordem)
   where p.id = x.id;
end;
$$;

revoke execute on function public.reordenar_perfis(uuid[]) from public, anon;
grant execute on function public.reordenar_perfis(uuid[]) to authenticated;
