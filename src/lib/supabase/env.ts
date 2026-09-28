/**
 * URL e chave pública (anon) do Supabase.
 * São públicas por natureza (vão para o navegador de qualquer forma e o
 * acesso aos dados é protegido pelo RLS). Por isso há um valor padrão do
 * projeto de produção, usado quando as variáveis não estão configuradas
 * na Vercel. Se forem definidas, as variáveis de ambiente têm prioridade.
 */
const URL_PADRAO = "https://heiwuuqdjxrtmfzeatkv.supabase.co";
const ANON_PADRAO =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlaXd1dXFkanhydG1memVhdGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1OTQxNDAsImV4cCI6MjEwNjE3MDE0MH0.c-j7AM8YCM5PQQ_nN_AKxv_1VkrDHPpWJ2DGJe6_Wrg";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || URL_PADRAO;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ANON_PADRAO;

export function supabaseEnv() {
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}
