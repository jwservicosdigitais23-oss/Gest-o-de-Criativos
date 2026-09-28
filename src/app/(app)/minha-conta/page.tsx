import type { Metadata } from "next";
import { FormTrocarSenha } from "@/components/acesso/form-trocar-senha";
import { Avatar } from "@/components/ui/avatar";
import { GlassCard } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { exigirMembro } from "@/lib/auth";
import { formatarDataHora } from "@/lib/datas";

export const metadata: Metadata = { title: "Minha conta" };

export default async function MinhaContaPage() {
  const { membro, verComo } = await exigirMembro();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader titulo="Minha conta" subtitulo="Seus dados de acesso ao CRM." />
      <GlassCard className="flex items-center gap-4 p-5">
        <Avatar nome={membro.nome} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-card-title text-navy-900">{membro.nome}</p>
          <p className="truncate text-body text-text-muted">{membro.email}</p>
          <p className="text-label text-text-muted">
            {membro.papel === "admin" ? "Administrador" : "Aprovadora"}
            {membro.ultimo_acesso && ` · último acesso em ${formatarDataHora(membro.ultimo_acesso)}`}
          </p>
        </div>
      </GlassCard>
      <GlassCard className="p-5 sm:p-6">
        <h2 className="text-card-title text-navy-900">Trocar senha</h2>
        <p className="mb-5 mt-1 text-body text-text-muted">Para sua segurança, confirme a senha atual.</p>
        <FormTrocarSenha somenteLeitura={Boolean(verComo)} />
      </GlassCard>
    </div>
  );
}
