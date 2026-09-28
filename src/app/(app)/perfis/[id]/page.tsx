import { notFound } from "next/navigation";
import { Inbox } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { exigirMembro } from "@/lib/auth";

export default async function PerfilPage(props: PageProps<"/perfis/[id]">) {
  const { id } = await props.params;
  const { supabase } = await exigirMembro();
  const { data: perfil } = await supabase.from("perfis").select("id, nome").eq("id", id).maybeSingle();
  if (!perfil) notFound();
  return (
    <>
      <CabecalhoPagina titulo={perfil.nome} />
      <EstadoVazio icone={Inbox} titulo="Nenhum post ainda" />
    </>
  );
}
