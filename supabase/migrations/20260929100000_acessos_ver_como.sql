-- =====================================================================
-- Prompt 9 · Acessos das aprovadoras e "Ver como"
-- - membros.deve_trocar_senha (obriga a troca no primeiro acesso)
-- - membros visíveis só para quem divide perfil (Edna não vê a Daniela)
-- - concluir_troca_senha(): a própria pessoa baixa a flag e registra
-- - leituras para o "Ver como" do admin (fila e notificações de outra
--   pessoa), sem login como ela e sem gravação nenhuma
-- As regras do fluxo de aprovação não mudam.
-- =====================================================================

alter table public.membros
  add column if not exists deve_trocar_senha boolean not null default false;

-- Quem foi convidada e nunca entrou ainda precisa criar a própria senha.
update public.membros
   set deve_trocar_senha = true
 where papel = 'aprovadora' and ultimo_acesso is null;

-- ---------------------------------------------------------------------
-- Visibilidade de membros: admin vê todos; a aprovadora vê a si mesma,
-- os administradores e quem aprova algum perfil em comum com ela.
-- ---------------------------------------------------------------------
create or replace function public.compartilha_perfil(p_membro uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.perfil_aprovadoras a
      join public.perfil_aprovadoras b on b.perfil_id = a.perfil_id
     where a.membro_id = auth.uid() and b.membro_id = p_membro
  )
$$;
revoke execute on function public.compartilha_perfil(uuid) from public, anon;
grant execute on function public.compartilha_perfil(uuid) to authenticated;

drop policy if exists membros_select on public.membros;
create policy membros_select on public.membros for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or (public.is_membro_ativo() and (papel = 'admin' or public.compartilha_perfil(id)))
  );

-- ---------------------------------------------------------------------
-- Troca de senha concluída: só a própria pessoa, só para "false".
-- A senha em si nunca passa pelo banco da aplicação (fica no Supabase Auth).
-- ---------------------------------------------------------------------
create or replace function public.concluir_troca_senha()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_primeira boolean;
begin
  if auth.uid() is null then
    raise exception 'Faça login.' using errcode = '42501';
  end if;
  select deve_trocar_senha into v_primeira from public.membros where id = auth.uid();
  if not found then
    raise exception 'Acesso não liberado.' using errcode = '42501';
  end if;
  update public.membros
     set deve_trocar_senha = false, ultimo_acesso = now()
   where id = auth.uid();
  insert into public.historico (entidade, entidade_id, acao, autor_id)
  values ('membro', auth.uid(), case when v_primeira then 'primeiro_acesso' else 'trocou_senha' end, auth.uid());
end;
$$;
revoke execute on function public.concluir_troca_senha() from public, anon;
grant execute on function public.concluir_troca_senha() to authenticated;

-- ---------------------------------------------------------------------
-- Fila da aprovadora: sem argumento, a de quem está logado (como antes);
-- com argumento, só o admin (usado no "Ver como").
-- ---------------------------------------------------------------------
drop function if exists public.fila_aprovadora();
create or replace function public.fila_aprovadora(p_membro uuid default null)
returns setof public.posts
language sql
stable
security invoker
set search_path = ''
as $$
  select p.*
    from public.posts p
    join public.pendencias_aprovadoras pa on pa.post_id = p.id
     and pa.membro_id = coalesce(p_membro, auth.uid())
   where p_membro is null or p_membro = auth.uid() or public.is_admin()
   order by p.prazo_aprovacao nulls last, p.data_publicacao, p.hora_publicacao nulls last
$$;
revoke execute on function public.fila_aprovadora(uuid) from public, anon;
grant execute on function public.fila_aprovadora(uuid) to authenticated;

-- Notificações de outra pessoa, somente leitura, somente para o admin.
create or replace function public.notificacoes_de(p_membro uuid, p_limite int default 50)
returns setof public.notificacoes
language sql
stable
security definer
set search_path = ''
as $$
  select n.*
    from public.notificacoes n
   where public.is_admin() and n.destinatario_id = p_membro
   order by n.created_at desc
   limit least(greatest(p_limite, 1), 200)
$$;
revoke execute on function public.notificacoes_de(uuid, int) from public, anon;
grant execute on function public.notificacoes_de(uuid, int) to authenticated;
