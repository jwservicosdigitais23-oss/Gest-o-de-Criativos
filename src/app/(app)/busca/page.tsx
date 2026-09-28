import type { Metadata } from "next";
import { Search, SearchX } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { LinhaPost, type PostCardDados } from "@/components/posts/card-post";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { exigirMembro } from "@/lib/auth";
import { carregarMiniaturas, contarObservacoes } from "@/lib/consultas";
import type { Post } from "@/lib/types";

export const metadata: Metadata = { title: "Buscar" };

export default async function BuscaPage(props: PageProps<"/busca">) {
  const { q } = await props.searchParams;
  const termo = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const { supabase } = await exigirMembro();

  let resultados: PostCardDados[] = [];
  if (termo) {
    const padrao = `%${termo.replace(/[%_,()]/g, " ")}%`;
    const { data } = await supabase
      .from("posts")
      .select("*, perfis(nome)")
      .or(`tema.ilike.${padrao},legenda.ilike.${padrao},pilar.ilike.${padrao}`)
      .order("data_publicacao", { ascending: false })
      .limit(50)
      .returns<(Post & { perfis: { nome: string } | null })[]>();
    const lista = data ?? [];
    const [mini, obs] = await Promise.all([
      carregarMiniaturas(supabase, lista),
      contarObservacoes(supabase, lista.map((p) => p.id)),
    ]);
    resultados = lista.map((p) => ({ ...p, perfilNome: p.perfis?.nome, miniatura: mini[p.id], observacoes: obs[p.id] ?? 0 }));
  }

  return (
    <>
      <CabecalhoPagina titulo="Buscar" subtitulo="Procure por tema, legenda ou pilar." />
      <form className="mb-6 flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">Buscar</label>
        <Input id="q" name="q" defaultValue={termo} placeholder="Buscar post, tema, legenda..." autoFocus className="max-w-xl" />
        <Button type="submit">
          <Search /> Buscar
        </Button>
      </form>
      {termo &&
        (resultados.length ? (
          <>
            <p className="mb-3 text-sm text-texto-2">
              {resultados.length} resultado(s) para “{termo}”
            </p>
            <Card className="overflow-hidden">
              {resultados.map((p) => (
                <LinhaPost key={p.id} post={p} />
              ))}
            </Card>
          </>
        ) : (
          <EstadoVazio icone={SearchX} titulo="Nada encontrado" descricao={`Nenhum post com “${termo}”.`} />
        ))}
    </>
  );
}
