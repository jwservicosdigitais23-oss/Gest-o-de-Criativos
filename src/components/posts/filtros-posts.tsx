"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Columns3, List } from "lucide-react";
import { Select } from "@/components/ui/input";
import { FORMATO_LABEL, STATUS_LABEL } from "@/lib/constantes";
import { nomeMes } from "@/lib/datas";
import { cn } from "@/lib/utils";

export function FiltrosPosts({ meses, vista }: { meses: string[]; vista: "kanban" | "lista" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function definir(chave: string, valor: string) {
    const novo = new URLSearchParams(params);
    if (valor) novo.set(chave, valor);
    else novo.delete(chave);
    router.replace(`${pathname}?${novo.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="grid grid-cols-3 gap-2 sm:flex">
        <label className="sr-only" htmlFor="f-status">Status</label>
        <Select id="f-status" value={params.get("status") ?? ""} onChange={(e) => definir("status", e.target.value)} className="sm:w-48">
          <option value="">Todos os status</option>
          {(["rascunho", "aguardando", "em_revisao", "aprovado", "publicado", "reprovado", "arquivado"] as const).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </Select>
        <label className="sr-only" htmlFor="f-formato">Formato</label>
        <Select id="f-formato" value={params.get("formato") ?? ""} onChange={(e) => definir("formato", e.target.value)} className="sm:w-40">
          <option value="">Todos os formatos</option>
          {Object.entries(FORMATO_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
        <label className="sr-only" htmlFor="f-mes">Mês</label>
        <Select id="f-mes" value={params.get("mes") ?? ""} onChange={(e) => definir("mes", e.target.value)} className="sm:w-44">
          <option value="">Todos os meses</option>
          {meses.map((m) => {
            const [a, mm] = m.split("-");
            return (
              <option key={m} value={m}>
                {nomeMes(Number(mm))[0]!.toUpperCase() + nomeMes(Number(mm)).slice(1)} {a}
              </option>
            );
          })}
        </Select>
      </div>
      <div className="hidden rounded-[10px] border border-borda bg-white p-1 md:inline-flex" role="group" aria-label="Visualização">
        {(
          [
            { v: "kanban", l: "Kanban", i: Columns3 },
            { v: "lista", l: "Lista", i: List },
          ] as const
        ).map(({ v, l, i: Icone }) => (
          <button
            key={v}
            type="button"
            onClick={() => definir("vista", v === "kanban" ? "" : v)}
            aria-pressed={vista === v}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-semibold",
              vista === v ? "bg-azul-medio text-white" : "text-texto-2 hover:text-azul-escuro",
            )}
          >
            <Icone className="size-4" /> {l}
          </button>
        ))}
      </div>
    </div>
  );
}
