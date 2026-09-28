import type { Metadata } from "next";
import { headers } from "next/headers";
import { Mail } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { listarNomes } from "@/lib/acessos";
import { exigirMembro } from "@/lib/auth";
import { carregarPerfis } from "@/lib/consultas";
import { emailConvite } from "@/lib/emails";

export const metadata: Metadata = { title: "Prévia · e-mail de convite" };

const ASSUNTO_CONVITE = "Seu acesso ao CRM de Aprovação de Criativos · Grupo Adere";

export default async function PreviaConvitePage() {
  const { supabase, membro, perfisIds } = await exigirMembro();
  const perfis = await carregarPerfis(supabase, false, perfisIds);
  const h = await headers();
  const origem = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const html = emailConvite({
    siteUrl: origem,
    link: "#previa",
    nome: membro.nome,
    perfis: listarNomes(perfis.map((p) => p.nome)),
  });
  return (
    <div className="bg-app min-h-[calc(100dvh-3rem)] px-4 py-8">
      <GlassCard className="mx-auto flex max-w-3xl flex-col overflow-hidden">
        <div className="flex flex-col gap-1 border-b border-border px-5 py-4 text-body">
          <p className="flex items-center gap-2 text-card-title text-navy-900">
            <Mail className="size-5 text-blue-600" aria-hidden /> {ASSUNTO_CONVITE}
          </p>
          <p className="text-text-muted">
            <strong className="text-navy-900">De:</strong> Adere · Aprovação de Criativos &nbsp;·&nbsp; <strong className="text-navy-900">Para:</strong>{" "}
            {membro.nome} &lt;{membro.email}&gt;
          </p>
        </div>
        <iframe title="E-mail de convite" srcDoc={html} sandbox="" className="h-[760px] w-full bg-[#EEF3FA]" />
      </GlassCard>
    </div>
  );
}
