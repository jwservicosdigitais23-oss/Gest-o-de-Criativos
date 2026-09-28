-- =====================================================================
-- Prompt 8 · Ajustes apontados pelo Security Advisor do Supabase
-- =====================================================================

-- Funções auxiliares do RLS: usadas pelas políticas (que valem só para
-- "authenticated"). Visitantes sem login não precisam executá-las.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_membro_ativo() from public, anon;
revoke execute on function public.is_aprovadora_do_perfil(uuid) from public, anon;
revoke execute on function public.pode_ver_perfil(uuid) from public, anon;
revoke execute on function public.pode_ver_post(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_membro_ativo() to authenticated;
grant execute on function public.is_aprovadora_do_perfil(uuid) to authenticated;
grant execute on function public.pode_ver_perfil(uuid) to authenticated;
grant execute on function public.pode_ver_post(uuid) to authenticated;

-- Só o trigger de decisões (security definer) calcula o status: ninguém
-- chama diretamente pela API (evita consultar o status de posts alheios).
revoke execute on function public.status_pelas_decisoes(uuid) from public, anon, authenticated;
