-- =====================================================================
-- Prompt 4 · Fluxo de aprovação
-- A aprovadora só INSERE em decisoes. O status do post é recalculado
-- por uma função security definer disparada por trigger.
-- =====================================================================

-- Uma decisão por aprovadora por versão.
create unique index decisoes_uma_por_versao on public.decisoes (post_id, versao, autor_id);

-- Antes de gravar: a decisão vale para a versão atual de um post aguardando.
create or replace function public.validar_decisao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
begin
  select * into v_post from public.posts where id = new.post_id for update;
  if not found then
    raise exception 'Post não encontrado.' using errcode = 'P0002';
  end if;
  if v_post.status <> 'aguardando' then
    raise exception 'Este post não está aguardando aprovação.' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.perfil_aprovadoras pa
    join public.membros m on m.id = pa.membro_id
    where pa.perfil_id = v_post.perfil_id and pa.membro_id = new.autor_id and m.ativo
  ) then
    raise exception 'Somente as aprovadoras do perfil podem decidir.' using errcode = '42501';
  end if;
  -- A decisão sempre se refere à versão atual (o cliente não escolhe).
  new.versao := v_post.versao;
  new.observacao := nullif(trim(coalesce(new.observacao, '')), '');
  new.created_at := now();
  if exists (
    select 1 from public.decisoes d
    where d.post_id = new.post_id and d.versao = new.versao and d.autor_id = new.autor_id
  ) then
    raise exception 'Você já registrou sua decisão nesta versão.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger decisoes_validar before insert on public.decisoes
  for each row execute function public.validar_decisao();

-- Regra de status a partir das decisões da versão atual.
--   qualquer_uma: a primeira decisão define o status.
--   todas: reprovação prevalece; qualquer revisão → em revisão;
--          aprovado só quando todas as aprovadoras ativas aprovarem.
create or replace function public.status_pelas_decisoes(p_post_id uuid)
returns public.status_post
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
  v_modo public.modo_aprovacao;
  v_total int;
  v_aprovados int;
begin
  select * into v_post from public.posts where id = p_post_id;
  select modo_aprovacao into v_modo from public.perfis where id = v_post.perfil_id;

  if exists (select 1 from public.decisoes where post_id = p_post_id and versao = v_post.versao and decisao = 'reprovado') then
    return 'reprovado';
  end if;
  if exists (select 1 from public.decisoes where post_id = p_post_id and versao = v_post.versao and decisao = 'revisar') then
    return 'em_revisao';
  end if;

  select count(distinct d.autor_id) into v_aprovados
    from public.decisoes d
   where d.post_id = p_post_id and d.versao = v_post.versao and d.decisao = 'aprovado';

  if v_modo = 'qualquer_uma' then
    return case when v_aprovados > 0 then 'aprovado'::public.status_post else 'aguardando'::public.status_post end;
  end if;

  select count(*) into v_total
    from public.perfil_aprovadoras pa
    join public.membros m on m.id = pa.membro_id
   where pa.perfil_id = v_post.perfil_id and m.ativo;

  if v_aprovados > 0 and v_aprovados >= v_total then
    return 'aprovado';
  end if;
  return 'aguardando';
end;
$$;

-- Depois de gravar: recalcula o status e registra no histórico.
create or replace function public.aplicar_decisao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_novo public.status_post;
  v_post public.posts;
begin
  v_novo := public.status_pelas_decisoes(new.post_id);

  perform set_config('adere.transicao', 'on', true);
  update public.posts
     set status = v_novo,
         decidido_em = case when v_novo in ('aprovado', 'reprovado') then now() else decidido_em end
   where id = new.post_id
   returning * into v_post;
  perform set_config('adere.transicao', 'off', true);

  insert into public.historico (entidade, entidade_id, post_id, perfil_id, acao, versao, autor_id, detalhes)
  values (
    'post', new.post_id, new.post_id, v_post.perfil_id,
    case new.decisao when 'aprovado' then 'aprovou' when 'revisar' then 'pediu_revisao' else 'reprovou' end,
    new.versao, new.autor_id,
    jsonb_build_object('decisao_id', new.id, 'observacao', new.observacao, 'itens', new.itens, 'status', v_novo)
  );
  return new;
end;
$$;

create trigger decisoes_aplicar after insert on public.decisoes
  for each row execute function public.aplicar_decisao();

-- Progresso de aprovações por post (card "1 de 2 aprovações").
create or replace view public.posts_progresso
with (security_invoker = true)
as
select
  p.id as post_id,
  p.versao,
  pf.modo_aprovacao,
  (select count(*) from public.perfil_aprovadoras pa join public.membros m on m.id = pa.membro_id
    where pa.perfil_id = p.perfil_id and m.ativo)::int as total_aprovadoras,
  (select count(distinct d.autor_id) from public.decisoes d
    where d.post_id = p.id and d.versao = p.versao and d.decisao = 'aprovado')::int as aprovacoes
from public.posts p
join public.perfis pf on pf.id = p.perfil_id;

grant select on public.posts_progresso to authenticated;

revoke execute on function public.status_pelas_decisoes(uuid) from public, anon;
grant execute on function public.status_pelas_decisoes(uuid) to authenticated;
