-- =====================================================================
-- Prompt 5 · Painel, notificações e histórico
-- KPIs calculados no banco (funções security invoker → respeitam o RLS)
-- e notificações geradas por triggers.
-- =====================================================================

-- Posts que ainda esperam a decisão de uma aprovadora (versão atual).
create or replace view public.pendencias_aprovadoras
with (security_invoker = true)
as
select p.id as post_id, pa.membro_id
  from public.posts p
  join public.perfil_aprovadoras pa on pa.perfil_id = p.perfil_id
  join public.membros m on m.id = pa.membro_id and m.ativo
 where p.status = 'aguardando'
   and not exists (
     select 1 from public.decisoes d
      where d.post_id = p.id and d.versao = p.versao and d.autor_id = pa.membro_id
   );

grant select on public.pendencias_aprovadoras to authenticated;

-- KPIs do painel do administrador.
create or replace function public.painel_kpis()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with hoje as (select public.hoje_sp() as d),
  primeiro_envio as (
    select h.post_id, min(h.created_at) as enviado
      from public.historico h
     where h.acao = 'enviou' and h.post_id is not null
     group by h.post_id
  )
  select jsonb_build_object(
    'aguardando', (select count(*) from public.posts where status = 'aguardando'),
    'aguardando_por_aprovadora', coalesce((
      select jsonb_agg(jsonb_build_object('membro_id', x.membro_id, 'nome', m.nome, 'total', x.total) order by m.nome)
        from (select membro_id, count(*) total from public.pendencias_aprovadoras group by membro_id) x
        join public.membros m on m.id = x.membro_id
    ), '[]'::jsonb),
    'em_revisao', (select count(*) from public.posts where status = 'em_revisao'),
    'aprovados_semana', (
      select count(*) from public.posts, hoje
       where status in ('aprovado', 'publicado')
         and data_publicacao between hoje.d and hoje.d + 6
    ),
    'semana_total', (
      select count(*) from public.posts, hoje
       where status not in ('reprovado', 'arquivado')
         and data_publicacao between hoje.d and hoje.d + 6
    ),
    'atrasados', (
      select count(*) from public.posts, hoje
       where status in ('aguardando', 'em_revisao')
         and prazo_aprovacao is not null and prazo_aprovacao < hoje.d
    ),
    'tempo_medio_horas', (
      select round((avg(extract(epoch from (p.decidido_em - pe.enviado)) / 3600))::numeric, 1)
        from public.posts p
        join primeiro_envio pe on pe.post_id = p.id
       where p.decidido_em is not null
         and p.decidido_em > now() - interval '90 days'
    )
  )
$$;

-- Contagem por status de cada perfil (bloco "Por perfil").
create or replace view public.perfis_status
with (security_invoker = true)
as
select p.id as perfil_id, p.nome, p.avatar_url, p.ordem,
       count(po.id) filter (where po.status = 'rascunho')::int as rascunho,
       count(po.id) filter (where po.status = 'aguardando')::int as aguardando,
       count(po.id) filter (where po.status = 'em_revisao')::int as em_revisao,
       count(po.id) filter (where po.status = 'aprovado')::int as aprovado,
       count(po.id) filter (where po.status = 'publicado')::int as publicado,
       count(po.id) filter (where po.status = 'reprovado')::int as reprovado
  from public.perfis p
  left join public.posts po on po.perfil_id = p.id
 where not p.arquivado
 group by p.id;

grant select on public.perfis_status to authenticated;

-- Fila da aprovadora logada, ordenada por prazo.
create or replace function public.fila_aprovadora()
returns setof public.posts
language sql
stable
security invoker
set search_path = ''
as $$
  select p.*
    from public.posts p
    join public.pendencias_aprovadoras pa on pa.post_id = p.id and pa.membro_id = auth.uid()
   order by p.prazo_aprovacao nulls last, p.data_publicacao, p.hora_publicacao nulls last
$$;

grant execute on function public.painel_kpis() to authenticated;
grant execute on function public.fila_aprovadora() to authenticated;
revoke execute on function public.painel_kpis() from anon;
revoke execute on function public.fila_aprovadora() from anon;

-- ---------------------------------------------------------------------
-- Notificações (triggers security definer)
-- ---------------------------------------------------------------------

-- Envio / reenvio para aprovação → aprovadoras do perfil.
create or replace function public.notificar_envio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'aguardando' and old.status is distinct from 'aguardando' then
    insert into public.notificacoes (destinatario_id, tipo, titulo, corpo, post_id)
    select pa.membro_id,
           case when new.versao > 1 then 'ajustado' else 'novo_post' end,
           case when new.versao > 1
                then format('%s foi ajustado (v%s)', new.tema, new.versao)
                else format('Novo post para aprovar: %s · %s', new.tema, to_char(new.data_publicacao, 'DD/MM/YYYY'))
           end,
           case when new.prazo_aprovacao is not null
                then format('Prazo de aprovação: %s', to_char(new.prazo_aprovacao, 'DD/MM/YYYY'))
           end,
           new.id
      from public.perfil_aprovadoras pa
      join public.membros m on m.id = pa.membro_id and m.ativo
     where pa.perfil_id = new.perfil_id;
  end if;
  return new;
end;
$$;

create trigger posts_notificar_envio after update of status on public.posts
  for each row execute function public.notificar_envio();

-- Decisão → administradores.
create or replace function public.notificar_decisao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tema text;
  v_nome text;
begin
  select tema into v_tema from public.posts where id = new.post_id;
  select nome into v_nome from public.membros where id = new.autor_id;

  insert into public.notificacoes (destinatario_id, tipo, titulo, corpo, post_id)
  select m.id,
         new.decisao::text,
         case new.decisao
           when 'aprovado' then format('%s aprovou %s', v_nome, v_tema)
           when 'revisar' then format('%s pediu revisão em %s', v_nome, v_tema)
           else format('%s reprovou %s', v_nome, v_tema)
         end,
         case when new.observacao is not null then left(new.observacao, 200) end,
         new.post_id
    from public.membros m
   where m.papel = 'admin' and m.ativo;
  return new;
end;
$$;

create trigger decisoes_notificar after insert on public.decisoes
  for each row execute function public.notificar_decisao();

-- Comentário → quem participa do post (admins e aprovadoras), menos o autor.
create or replace function public.notificar_comentario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
  v_nome text;
begin
  select * into v_post from public.posts where id = new.post_id;
  select nome into v_nome from public.membros where id = new.autor_id;
  insert into public.notificacoes (destinatario_id, tipo, titulo, corpo, post_id)
  select distinct x.id, 'comentario', format('%s comentou em %s', v_nome, v_post.tema), left(new.texto, 200), new.post_id
    from (
      select m.id from public.membros m where m.papel = 'admin' and m.ativo
      union
      select pa.membro_id from public.perfil_aprovadoras pa
        join public.membros m on m.id = pa.membro_id and m.ativo
       where pa.perfil_id = v_post.perfil_id
    ) x
   where x.id <> new.autor_id;
  return new;
end;
$$;

create trigger comentarios_notificar after insert on public.comentarios
  for each row execute function public.notificar_comentario();

-- Só o campo "lida" pode ser alterado pelo destinatário.
revoke update on public.notificacoes from authenticated;
grant update (lida) on public.notificacoes to authenticated;

-- Realtime entrega o registro completo nas mudanças.
alter table public.notificacoes replica identity full;
