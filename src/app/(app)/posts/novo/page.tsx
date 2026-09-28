import type { Metadata } from "next";
import Link from "next/link";
import { UserSquare2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FormPost } from "@/components/posts/form-post";
import { Button } from "@/components/ui/button";
import { exigirAdmin } from "@/lib/auth";
import { carregarPerfis } from "@/lib/consultas";

export const metadata: Metadata = { title: "Novo post" };

export default async function NovoPostPage(props: PageProps<"/posts/novo">) {
  const { supabase } = await exigirAdmin();
  const { perfil, data } = await props.searchParams;
  const perfis = await carregarPerfis(supabase);

  if (perfis.length === 0) {
    return (
      <EmptyState
        icone={UserSquare2}
        titulo="Cadastre um perfil primeiro"
        descricao="Os posts pertencem a um perfil do LinkedIn."
        acao={
          <Button asChild>
            <Link href="/configuracoes">Ir para Configurações</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <PageHeader titulo="Novo post" subtitulo="Preencha os dados, envie a mídia e confira a prévia do LinkedIn." />
      <FormPost
        perfis={perfis.map((p) => ({ id: p.id, nome: p.nome, avatarSrc: p.avatarSrc, tipo: p.tipo }))}
        post={null}
        midiasIniciais={[]}
        versaoEdicao={1}
        padrao={{
          perfil_id: typeof perfil === "string" ? perfil : undefined,
          data_publicacao: typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : undefined,
        }}
      />
    </>
  );
}
