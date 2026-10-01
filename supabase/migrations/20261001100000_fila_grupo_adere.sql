-- =====================================================================
-- Fila do Grupo Adere (docs/validacao-fila-grupo-adere.md)
-- 1. pendencias_aprovadoras ganha perfil_id (contadores da sidebar usam a
--    mesma fonte do Painel)
-- 2. Ao vincular uma aprovadora a um perfil, ela recebe a notificação dos
--    posts que já estavam esperando por ela
-- 3. Vínculos Edna → Grupo Adere e Daniela → Grupo Adere (idempotente)
-- 4. Backfill das notificações dos posts pendentes
-- Visibilidade e decisão continuam dependendo só de: membro ativo +
-- vínculo em perfil_aprovadoras. Nada depende de já ter feito login.
-- =====================================================================

-- 1. Mesma view, com perfil_id no fim (create or replace só acrescenta colunas).
create or replace view public.pendencias_aprovadoras
with (security_invoker = true)
as
select p.id as post_id, pa.membro_id, p.perfil_id
  from public.posts p
  join public.perfil_aprovadoras pa on pa.perfil_id = p.perfil_id
  join public.membros m on m.id = pa.membro_id and m.ativo
 where p.status = 'aguardando'
   and not exists (
     select 1 from public.decisoes d
      where d.post_id = p.id and d.versao = p.versao and d.autor_id = pa.membro_id
   );

grant select on public.pendencias_aprovadoras to authenticated;

-- 2. Notifica as pendências que ainda não têm aviso (filtros opcionais).
--    Não duplica: pula quem já tem notificação de envio daquele post.
create or replace function public.notificar_pendencias(p_membro uuid default null, p_perfil uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
begin
  insert into public.notificacoes (destinatario_id, tipo, titulo, corpo, post_id)
  select pa.membro_id,
         case when p.versao > 1 then 'ajustado' else 'novo_post' end,
         case when p.versao > 1
              then format('%s foi ajustado (v%s)', p.tema, p.versao)
              else format('Novo post para aprovar: %s · %s', p.tema, to_char(p.data_publicacao, 'DD/MM/YYYY'))
         end,
         case when p.prazo_aprovacao is not null
              then format('Prazo de aprovação: %s', to_char(p.prazo_aprovacao, 'DD/MM/YYYY'))
         end,
         p.id
    from public.pendencias_aprovadoras pa
    join public.posts p on p.id = pa.post_id
   where (p_membro is null or pa.membro_id = p_membro)
     and (p_perfil is null or pa.perfil_id = p_perfil)
     and not exists (
       select 1 from public.notificacoes n
        where n.post_id = p.id
          and n.destinatario_id = pa.membro_id
          and n.tipo in ('novo_post', 'ajustado')
     );
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke execute on function public.notificar_pendencias(uuid, uuid) from public, anon, authenticated;

create or replace function public.notificar_vinculo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notificar_pendencias(new.membro_id, new.perfil_id);
  return new;
end;
$$;

revoke execute on function public.notificar_vinculo() from public, anon, authenticated;

drop trigger if exists perfil_aprovadoras_notificar on public.perfil_aprovadoras;
create trigger perfil_aprovadoras_notificar
  after insert on public.perfil_aprovadoras
  for each row execute function public.notificar_vinculo();

-- 3. Vínculos do Grupo Adere (só se as pessoas existirem; sem duplicar).
insert into public.perfil_aprovadoras (perfil_id, membro_id)
select pf.id, m.id
  from public.perfis pf
  join public.membros m
    on lower(m.email) in ('edna.queiroz@grupoadere.com.br', 'daniquintana@grupoadere.com.br')
 where pf.nome = 'Grupo Adere'
   and m.papel = 'aprovadora'
on conflict (perfil_id, membro_id) do nothing;

-- 4. Backfill: avisa todas as pendências de hoje que ainda não têm aviso.
select public.notificar_pendencias();
