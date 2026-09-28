import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ListaNotificacoes } from "@/components/lista-notificacoes";
import { exigirMembro } from "@/lib/auth";
import type { Notificacao } from "@/lib/types";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificacoesPage() {
  const { supabase, membro, verComo } = await exigirMembro();
  const { data } = verComo
    ? await supabase.rpc("notificacoes_de", { p_membro: membro.id, p_limite: 100 }).then((r) => ({ data: r.data as Notificacao[] | null }))
    : await supabase
        .from("notificacoes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)
        .returns<Notificacao[]>();
  return (
    <>
      <PageHeader titulo="Notificações" subtitulo="Envios, decisões e comentários dos seus posts." />
      <ListaNotificacoes itens={data ?? []} usuarioId={membro.id} somenteLeitura={Boolean(verComo)} />
    </>
  );
}
