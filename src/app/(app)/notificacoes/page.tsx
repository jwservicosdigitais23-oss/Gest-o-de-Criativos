import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaNotificacoes } from "@/components/lista-notificacoes";
import { exigirMembro } from "@/lib/auth";
import type { Notificacao } from "@/lib/types";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificacoesPage() {
  const { supabase, membro } = await exigirMembro();
  const { data } = await supabase
    .from("notificacoes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Notificacao[]>();
  return (
    <>
      <CabecalhoPagina titulo="Notificações" subtitulo="Envios, decisões e comentários dos seus posts." />
      <ListaNotificacoes itens={data ?? []} usuarioId={membro.id} />
    </>
  );
}
