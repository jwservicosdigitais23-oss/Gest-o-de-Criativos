-- =====================================================================
-- Primeiro acesso sem depender da SUPABASE_SERVICE_ROLE_KEY:
-- o primeiro usuário (quando ainda não há nenhum membro) já nasce com o
-- e-mail confirmado, para poder entrar logo após o cadastro.
-- Todos os demais continuam precisando de convite.
-- =====================================================================
create or replace function public.confirmar_primeiro_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.membros) then
    new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  end if;
  return new;
end;
$$;

revoke execute on function public.confirmar_primeiro_usuario() from public, anon, authenticated;

drop trigger if exists on_auth_user_before_insert on auth.users;
create trigger on_auth_user_before_insert
  before insert on auth.users
  for each row execute function public.confirmar_primeiro_usuario();
