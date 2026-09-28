import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { FormPost } from "@/components/posts/form-post";
import type { ItemMidia } from "@/components/posts/lista-midias";
import { exigirAdmin } from "@/lib/auth";
import { assinarMidias, carregarPerfis } from "@/lib/consultas";
import { midiasDaVersao, podeEditar, versaoDeEdicao } from "@/lib/posts";
import type { Midia, Post } from "@/lib/types";

export const metadata: Metadata = { title: "Editar post" };

export default async function EditarPostPage(props: PageProps<"/posts/[id]/editar">) {
  const { id } = await props.params;
  const { supabase } = await exigirAdmin();
  const { data: post } = await supabase.from("posts").select("*").eq("id", id).maybeSingle<Post>();
  if (!post) notFound();
  if (!podeEditar(post.status)) redirect(`/posts/${id}`);

  const versao = versaoDeEdicao(post);
  const [perfis, { data: todas }] = await Promise.all([
    carregarPerfis(supabase, true),
    supabase.from("midias").select("*").eq("post_id", id).returns<Midia[]>(),
  ]);
  const midias = await assinarMidias(supabase, midiasDaVersao(todas ?? [], versao));
  const itens: ItemMidia[] = midias.map((m) => ({
    chave: m.id,
    id: m.id,
    tipo: m.tipo,
    storage_path: m.storage_path,
    url_externa: m.url_externa,
    nome_arquivo: m.nome_arquivo,
    mime: m.mime,
    tamanho: m.tamanho,
    largura: m.largura,
    altura: m.altura,
    src: m.src,
  }));

  return (
    <>
      <PageHeader titulo="Editar post" subtitulo={post.tema} />
      <FormPost
        perfis={perfis
          .filter((p) => !p.arquivado || p.id === post.perfil_id)
          .map((p) => ({ id: p.id, nome: p.nome, avatarSrc: p.avatarSrc, tipo: p.tipo }))}
        post={post}
        midiasIniciais={itens}
        versaoEdicao={versao}
      />
    </>
  );
}
