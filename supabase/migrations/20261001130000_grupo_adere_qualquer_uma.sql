-- =====================================================================
-- Grupo Adere: basta uma aprovação (Edna OU Daniela).
-- O post continua na fila das duas; a primeira decisão vale e ele sai da
-- fila da outra, que passa a vê-lo como "Aprovado por <nome>".
-- (O modo continua editável em Configurações › Perfis.)
-- =====================================================================

update public.perfis
   set modo_aprovacao = 'qualquer_uma'
 where nome = 'Grupo Adere'
   and modo_aprovacao <> 'qualquer_uma';

-- Reavalia posts do Grupo Adere que já tinham alguma aprovação.
do $$
begin
  perform set_config('adere.transicao', 'on', true);
  update public.posts p
     set status = public.status_pelas_decisoes(p.id),
         decidido_em = case when public.status_pelas_decisoes(p.id) in ('aprovado', 'reprovado') then now() else p.decidido_em end
   where p.status = 'aguardando'
     and p.perfil_id in (select id from public.perfis where nome = 'Grupo Adere')
     and public.status_pelas_decisoes(p.id) <> 'aguardando';
  perform set_config('adere.transicao', 'off', true);
end;
$$;

-- Quem tomou a(s) decisão(ões) que definiram o status atual (versão atual):
-- "Daniela Quintana" (qualquer uma) ou "Edna Queiroz e Daniela Quintana" (todas).
-- security_invoker: cada pessoa só vê o que o RLS de decisões/membros permite.
create or replace view public.posts_decidido_por
with (security_invoker = true)
as
select p.id as post_id,
       string_agg(m.nome, ' e ' order by d.created_at) as autor_nome
  from public.posts p
  join public.decisoes d on d.post_id = p.id and d.versao = p.versao
  join public.membros m on m.id = d.autor_id
 where (p.status in ('aprovado', 'publicado') and d.decisao = 'aprovado')
    or (p.status = 'reprovado' and d.decisao = 'reprovado')
 group by p.id;

grant select on public.posts_decidido_por to authenticated;
