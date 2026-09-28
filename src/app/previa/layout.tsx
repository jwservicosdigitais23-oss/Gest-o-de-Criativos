import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { exigirMembro } from "@/lib/auth";
import { redirect } from "next/navigation";

/** Pré-visualizações do "Ver como": só o admin, só com a visualização ativa. */
export default async function PreviaLayout({ children }: { children: React.ReactNode }) {
  const { verComo } = await exigirMembro();
  if (!verComo) redirect("/");
  return (
    <div className="min-h-dvh">
      <div
        role="status"
        className="fixed inset-x-0 top-0 z-50 flex h-12 items-center gap-3 border-b border-warning/50 bg-[#FFB020] px-3 text-navy-900 shadow-card sm:px-5"
      >
        <Eye className="size-5 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-body">
          Pré-visualização como <strong>{verComo.alvo.nome}</strong> — nada é enviado nem gravado
        </p>
        <Link
          href="/"
          className="transicao inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-control)] bg-navy-900 px-3 text-label font-bold text-white hover:bg-navy-700"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Voltar ao CRM
        </Link>
      </div>
      <div className="pt-12">{children}</div>
    </div>
  );
}
