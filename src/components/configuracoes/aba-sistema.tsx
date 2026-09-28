"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { HardDrive, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { limparOrfaos } from "@/app/(app)/configuracoes/actions";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { formatarTamanho } from "@/lib/posts";

export interface UsoStorage {
  arquivos: number;
  bytes: number;
  por_tipo: Record<string, number>;
  orfaos: number;
  bytes_orfaos: number;
}

/** Plano Free do Supabase: 1 GB de Storage. Ajuste se mudar de plano. */
const LIMITE_STORAGE_BYTES = 1024 * 1024 * 1024;

const TIPOS: Record<string, { rotulo: string; cor: string }> = {
  imagens: { rotulo: "Imagens", cor: "#004C97" },
  videos: { rotulo: "Vídeos", cor: "#00AEEF" },
  pdfs: { rotulo: "PDFs", cor: "#001F4D" },
  outros: { rotulo: "Outros", cor: "#6B7A90" },
};

export function AbaSistema({ uso }: { uso: UsoStorage | null }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  if (!uso) return <p className="text-sm text-texto-2">Não foi possível ler o uso do Storage.</p>;
  const pct = Math.min(100, (uso.bytes / LIMITE_STORAGE_BYTES) * 100);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-st-aguardando-bg text-azul-medio">
            <HardDrive className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-bold">Espaço do Storage</h2>
            <p className="text-sm text-texto-2">
              {formatarTamanho(uso.bytes) || "0 KB"} de {formatarTamanho(LIMITE_STORAGE_BYTES)} · {uso.arquivos} arquivo(s)
            </p>
          </div>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-fundo" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Uso do Storage">
          {Object.entries(uso.por_tipo).map(([tipo, bytes]) => (
            <div
              key={tipo}
              style={{ width: `${(bytes / LIMITE_STORAGE_BYTES) * 100}%`, backgroundColor: TIPOS[tipo]?.cor ?? "#6B7A90" }}
              title={`${TIPOS[tipo]?.rotulo ?? tipo}: ${formatarTamanho(bytes)}`}
            />
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-texto-2">
          {Object.entries(uso.por_tipo).map(([tipo, bytes]) => (
            <li key={tipo} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: TIPOS[tipo]?.cor ?? "#6B7A90" }} />
              {TIPOS[tipo]?.rotulo ?? tipo}: {formatarTamanho(bytes)}
            </li>
          ))}
        </ul>
        <p className="text-xs text-texto-2">Plano Free: 1 GB de Storage e até 50 MB por arquivo.</p>
      </GlassCard>

      <GlassCard className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-base font-bold">Arquivos órfãos</h2>
          <p className="text-sm text-texto-2">
            Arquivos enviados há mais de 24h que nenhum post, perfil ou membro usa (ex.: upload de um formulário cancelado).
          </p>
        </div>
        <p className="text-2xl font-bold text-azul-escuro">
          {uso.orfaos} <span className="text-sm font-semibold text-texto-2">arquivo(s) · {formatarTamanho(uso.bytes_orfaos) || "0 KB"}</span>
        </p>
        <Button
          variant="danger"
          className="self-start"
          disabled={pendente || uso.orfaos === 0}
          onClick={() =>
            iniciar(async () => {
              const r = await limparOrfaos();
              if (!r.ok) {
                toast.error(r.erro);
                return;
              }
              toast.success(`${r.dados!.removidos} arquivo(s) órfão(s) removido(s)`);
              router.refresh();
            })
          }
        >
          {pendente ? <Loader2 className="animate-spin" /> : <Trash2 />} Limpar órfãos
        </Button>
      </GlassCard>
    </div>
  );
}
