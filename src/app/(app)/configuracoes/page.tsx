import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { AbaMembros } from "@/components/configuracoes/aba-membros";
import { AbaPerfis } from "@/components/configuracoes/aba-perfis";
import { AbasConfiguracoes } from "@/components/configuracoes/abas-configuracoes";
import type { MembroConfig, PerfilConfig } from "@/components/configuracoes/tipos";
import { exigirAdmin } from "@/lib/auth";
import { assinarUrls } from "@/lib/storage";
import type { Membro, Perfil } from "@/lib/types";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage(props: PageProps<"/configuracoes">) {
  const { supabase, userId } = await exigirAdmin();
  const { aba } = await props.searchParams;

  const [{ data: perfis }, { data: membros }, { data: vinculos }, { data: resumo }] = await Promise.all([
    supabase.from("perfis").select("*").order("ordem").order("nome").returns<Perfil[]>(),
    supabase.from("membros").select("*").order("papel").order("nome").returns<Membro[]>(),
    supabase.from("perfil_aprovadoras").select("perfil_id, membro_id"),
    supabase.from("perfis_resumo").select("perfil_id, total_posts"),
  ]);

  const urls = await assinarUrls(supabase, [
    ...(perfis ?? []).map((p) => p.avatar_url),
    ...(membros ?? []).map((m) => m.avatar_url),
  ]);
  const totais = new Map((resumo ?? []).map((r) => [r.perfil_id as string, r.total_posts as number]));

  const perfisConfig: PerfilConfig[] = (perfis ?? []).map((p) => ({
    ...p,
    avatarSrc: p.avatar_url ? (urls[p.avatar_url] ?? null) : null,
    aprovadoras: (vinculos ?? []).filter((v) => v.perfil_id === p.id).map((v) => v.membro_id as string),
    totalPosts: totais.get(p.id) ?? 0,
  }));
  const membrosConfig: MembroConfig[] = (membros ?? []).map((m) => ({
    id: m.id,
    nome: m.nome,
    email: m.email,
    papel: m.papel,
    ativo: m.ativo,
    ultimo_acesso: m.ultimo_acesso,
    avatarSrc: m.avatar_url ? (urls[m.avatar_url] ?? null) : null,
    perfis: (vinculos ?? []).filter((v) => v.membro_id === m.id).map((v) => v.perfil_id as string),
  }));

  const abaInicial = aba === "membros" || aba === "sistema" ? aba : "perfis";

  return (
    <>
      <CabecalhoPagina titulo="Configurações" subtitulo="Perfis do LinkedIn, membros e acessos." />
      <AbasConfiguracoes
        abaInicial={abaInicial}
        perfis={<AbaPerfis perfis={perfisConfig} membros={membrosConfig} />}
        membros={<AbaMembros membros={membrosConfig} perfis={perfisConfig} usuarioId={userId} />}
      />
    </>
  );
}
