"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Columns3, List } from "lucide-react";
import { Select } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { FORMATO_LABEL } from "@/lib/constantes";
import { nomeMes } from "@/lib/datas";
import { ORDEM_STATUS, STATUS } from "@/lib/status";

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
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="f-status">Status</label>
        <Select id="f-status" className="w-auto" value={params.get("status") ?? ""} onChange={(e) => definir("status", e.target.value)}>
          <option value="">Todos os status</option>
          {[...ORDEM_STATUS, "arquivado" as const].map((s) => (
            <option key={s} value={s}>{STATUS[s].rotulo}</option>
          ))}
        </Select>
        <label className="sr-only" htmlFor="f-formato">Formato</label>
        <Select id="f-formato" className="w-auto" value={params.get("formato") ?? ""} onChange={(e) => definir("formato", e.target.value)}>
          <option value="">Todos os formatos</option>
          {Object.entries(FORMATO_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
        <label className="sr-only" htmlFor="f-mes">Mês</label>
        <Select id="f-mes" className="w-auto" value={params.get("mes") ?? ""} onChange={(e) => definir("mes", e.target.value)}>
          <option value="">Todos os meses</option>
          {meses.map((m) => {
            const nome = nomeMes(Number(m.slice(5, 7)));
            return (
              <option key={m} value={m}>
                {nome[0]!.toUpperCase() + nome.slice(1)} {m.slice(0, 4)}
              </option>
            );
          })}
        </Select>
      </div>
      <SegmentedControl
        className="hidden md:inline-flex"
        rotulo="Visualização"
        valor={vista}
        onChange={(v) => definir("vista", v === "kanban" ? "" : v)}
        opcoes={[
          { valor: "kanban", rotulo: "Kanban", icone: Columns3 },
          { valor: "lista", rotulo: "Lista", icone: List },
        ]}
      />
    </div>
  );
}
