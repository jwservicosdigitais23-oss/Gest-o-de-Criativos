-- =====================================================================
-- Prompt 3 · Posts, upload e prévia LinkedIn
-- =====================================================================

create index if not exists midias_storage_path on public.midias (storage_path);

-- Leitura do Storage passa a seguir o registro da mídia (e não a pasta):
-- assim um post movido de perfil, ou duplicado, continua legível por quem
-- pode ver o post. Upload/remoção continuam só para o admin.
drop policy if exists midias_storage_select on storage.objects;
create policy midias_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'midias'
    and (
      public.is_admin()
      or exists (
        select 1 from public.midias m
        where m.storage_path = storage.objects.name and public.pode_ver_post(m.post_id)
      )
      or exists (
        select 1 from public.perfis p
        where p.avatar_url = storage.objects.name and public.pode_ver_perfil(p.id)
      )
      or exists (
        select 1 from public.membros mb
        where mb.avatar_url = storage.objects.name and public.is_membro_ativo()
      )
    )
  );

-- Mídias válidas numa versão: criadas até ela e não removidas antes dela.
create or replace function public.midias_da_versao(p_post_id uuid, p_versao integer)
returns setof public.midias
language sql
stable
security invoker
set search_path = ''
as $$
  select *
    from public.midias m
   where m.post_id = p_post_id
     and m.versao <= p_versao
     and (m.versao_removida is null or m.versao_removida > p_versao)
   order by m.ordem, m.created_at
$$;

-- Número de observações por post (cards do Kanban).
create or replace view public.posts_observacoes
with (security_invoker = true)
as
select d.post_id, count(*)::int as observacoes
  from public.decisoes d
 where coalesce(trim(d.observacao), '') <> ''
 group by d.post_id;

grant select on public.posts_observacoes to authenticated;

-- ---------------------------------------------------------------------
-- Transições feitas pelo administrador (as decisões vêm no Prompt 4)
-- As funções ligam "adere.transicao" para o trigger de guarda aceitar
-- a troca de status.
-- ---------------------------------------------------------------------

-- Envia (ou reenvia) o post para aprovação.
--   rascunho                      → aguardando (mesma versão)
--   em_revisao/aguardando/aprovado → aguardando (versão + 1)
create or replace function public.enviar_para_aprovacao(p_post_id uuid)
returns public.posts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_post public.posts;
  v_nova_versao integer;
  v_midias integer;
  v_acao text;
begin
  if not public.is_admin() then
    raise exception 'Somente o administrador envia posts para aprovação.' using errcode = '42501';
  end if;

  select * into v_post from public.posts where id = p_post_id for update;
  if not found then
    raise exception 'Post não encontrado.' using errcode = 'P0002';
  end if;

  if v_post.status = 'rascunho' then
    v_nova_versao := v_post.versao;
    v_acao := 'enviou';
  elsif v_post.status in ('em_revisao', 'aguardando', 'aprovado') then
    v_nova_versao := v_post.versao + 1;
    v_acao := case v_post.status when 'em_revisao' then 'reenviou' else 'editou_e_reenviou' end;
  else
    raise exception 'Um post % não pode ser enviado para aprovação.', v_post.status using errcode = 'P0001';
  end if;

  select count(*) into v_midias from public.midias_da_versao(p_post_id, v_nova_versao);
  if v_post.formato <> 'texto' and v_midias = 0 then
    raise exception 'Adicione ao menos uma mídia antes de enviar para aprovação.' using errcode = 'P0001';
  end if;

  perform set_config('adere.transicao', 'on', true);
  update public.posts
     set status = 'aguardando',
         versao = v_nova_versao,
         enviado_em = now(),
         decidido_em = null
   where id = p_post_id
   returning * into v_post;
  perform set_config('adere.transicao', 'off', true);

  insert into public.post_versoes
    (post_id, versao, tema, legenda, formato, pilar, cta, data_publicacao, hora_publicacao, enviado_por)
  values
    (v_post.id, v_post.versao, v_post.tema, v_post.legenda, v_post.formato, v_post.pilar, v_post.cta,
     v_post.data_publicacao, v_post.hora_publicacao, auth.uid());

  insert into public.historico (entidade, entidade_id, post_id, perfil_id, acao, versao, autor_id)
  values ('post', v_post.id, v_post.id, v_post.perfil_id, v_acao, v_post.versao, auth.uid());

  return v_post;
end;
$$;

-- Aprovado → Publicado (com o link do post no LinkedIn)
create or replace function public.marcar_publicado(p_post_id uuid, p_link text)
returns public.posts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_post public.posts;
begin
  if not public.is_admin() then
    raise exception 'Somente o administrador marca posts como publicados.' using errcode = '42501';
  end if;
  if coalesce(trim(p_link), '') !~* '^https?://' then
    raise exception 'Informe o link do post publicado.' using errcode = '22023';
  end if;
  select * into v_post from public.posts where id = p_post_id for update;
  if not found then
    raise exception 'Post não encontrado.' using errcode = 'P0002';
  end if;
  if v_post.status <> 'aprovado' then
    raise exception 'Só posts aprovados podem ser marcados como publicados.' using errcode = 'P0001';
  end if;

  perform set_config('adere.transicao', 'on', true);
  update public.posts
     set status = 'publicado', link_publicado = trim(p_link), publicado_em = now()
   where id = p_post_id
   returning * into v_post;
  perform set_config('adere.transicao', 'off', true);

  insert into public.historico (entidade, entidade_id, post_id, perfil_id, acao, versao, autor_id, detalhes)
  values ('post', v_post.id, v_post.id, v_post.perfil_id, 'publicou', v_post.versao, auth.uid(),
          jsonb_build_object('link', v_post.link_publicado));
  return v_post;
end;
$$;

-- Duplica como novo rascunho (v1), reaproveitando as mídias da versão atual.
create or replace function public.duplicar_post(p_post_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_post public.posts;
  v_novo uuid := gen_random_uuid();
begin
  if not public.is_admin() then
    raise exception 'Somente o administrador duplica posts.' using errcode = '42501';
  end if;
  select * into v_post from public.posts where id = p_post_id;
  if not found then
    raise exception 'Post não encontrado.' using errcode = 'P0002';
  end if;

  insert into public.posts
    (id, perfil_id, status, data_publicacao, hora_publicacao, tema, legenda, formato, pilar, cta,
     prazo_aprovacao, versao, origem, arquivo_ref, duplicado_de, criado_por)
  values
    (v_novo, v_post.perfil_id, 'rascunho', v_post.data_publicacao, v_post.hora_publicacao,
     left(v_post.tema || ' (cópia)', 300), v_post.legenda, v_post.formato, v_post.pilar, v_post.cta,
     v_post.prazo_aprovacao, 1, 'manual', v_post.arquivo_ref, v_post.id, auth.uid());

  insert into public.midias
    (post_id, versao, ordem, tipo, storage_path, url_externa, nome_arquivo, mime, tamanho, largura, altura)
  select v_novo, 1, m.ordem, m.tipo, m.storage_path, m.url_externa, m.nome_arquivo, m.mime, m.tamanho, m.largura, m.altura
    from public.midias_da_versao(p_post_id, v_post.versao) m;

  insert into public.historico (entidade, entidade_id, post_id, perfil_id, acao, versao, autor_id, detalhes)
  values ('post', v_novo, v_novo, v_post.perfil_id, 'duplicou', 1, auth.uid(),
          jsonb_build_object('origem', p_post_id));
  return v_novo;
end;
$$;

-- Exclui o post. Com decisões registradas não dá (são imutáveis): arquive.
create or replace function public.excluir_post(p_post_id uuid)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_post public.posts;
  v_caminhos text[];
begin
  if not public.is_admin() then
    raise exception 'Somente o administrador exclui posts.' using errcode = '42501';
  end if;
  select * into v_post from public.posts where id = p_post_id;
  if not found then
    raise exception 'Post não encontrado.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.decisoes where post_id = p_post_id) then
    raise exception 'Este post já tem decisões registradas e não pode ser excluído. Use "Arquivar".'
      using errcode = 'P0001';
  end if;

  -- Caminhos que só este post usa (duplicatas podem compartilhar arquivos).
  select coalesce(array_agg(distinct m.storage_path), '{}') into v_caminhos
    from public.midias m
   where m.post_id = p_post_id and m.storage_path is not null
     and not exists (
       select 1 from public.midias o where o.storage_path = m.storage_path and o.post_id <> p_post_id
     );

  insert into public.historico (entidade, entidade_id, post_id, perfil_id, acao, versao, autor_id, detalhes)
  values ('post', p_post_id, p_post_id, v_post.perfil_id, 'excluiu', v_post.versao, auth.uid(),
          jsonb_build_object('tema', v_post.tema, 'data', v_post.data_publicacao));

  perform set_config('adere.exclusao_definitiva', 'on', true);
  delete from public.posts where id = p_post_id;
  perform set_config('adere.exclusao_definitiva', 'off', true);
  return v_caminhos;
end;
$$;

-- Arquiva (some das listas, mantém tudo).
create or replace function public.arquivar_post(p_post_id uuid)
returns public.posts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_post public.posts;
begin
  if not public.is_admin() then
    raise exception 'Somente o administrador arquiva posts.' using errcode = '42501';
  end if;
  perform set_config('adere.transicao', 'on', true);
  update public.posts set status = 'arquivado' where id = p_post_id returning * into v_post;
  perform set_config('adere.transicao', 'off', true);
  if not found then
    raise exception 'Post não encontrado.' using errcode = 'P0002';
  end if;
  insert into public.historico (entidade, entidade_id, post_id, perfil_id, acao, versao, autor_id)
  values ('post', v_post.id, v_post.id, v_post.perfil_id, 'arquivou', v_post.versao, auth.uid());
  return v_post;
end;
$$;

-- Guarda: o status só muda pelas funções de transição (ou pelo trigger
-- de decisões, no Prompt 4). Um UPDATE direto em posts.status é recusado.
create or replace function public.guardar_status_post()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('adere.transicao', true), 'off') <> 'on' then
    raise exception 'O status do post só muda pelo fluxo de aprovação.' using errcode = '42501';
  end if;
  if new.versao is distinct from old.versao
     and coalesce(current_setting('adere.transicao', true), 'off') <> 'on' then
    raise exception 'A versão do post só muda pelo fluxo de aprovação.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger posts_guardar_status before update on public.posts
  for each row execute function public.guardar_status_post();

-- Posts novos sempre nascem como rascunho v1 (exceto pela duplicação/importação,
-- que também usam rascunho).
create or replace function public.posts_nascem_rascunho()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('adere.transicao', true), 'off') <> 'on' then
    new.status := 'rascunho';
    new.versao := 1;
    new.enviado_em := null;
    new.decidido_em := null;
  end if;
  return new;
end;
$$;

create trigger posts_insert_rascunho before insert on public.posts
  for each row execute function public.posts_nascem_rascunho();

revoke execute on function public.enviar_para_aprovacao(uuid) from public, anon;
revoke execute on function public.marcar_publicado(uuid, text) from public, anon;
revoke execute on function public.duplicar_post(uuid) from public, anon;
revoke execute on function public.excluir_post(uuid) from public, anon;
revoke execute on function public.arquivar_post(uuid) from public, anon;
grant execute on function public.enviar_para_aprovacao(uuid) to authenticated;
grant execute on function public.marcar_publicado(uuid, text) to authenticated;
grant execute on function public.duplicar_post(uuid) to authenticated;
grant execute on function public.excluir_post(uuid) to authenticated;
grant execute on function public.arquivar_post(uuid) to authenticated;
