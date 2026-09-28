"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/input";
import { nomeMes } from "@/lib/datas";

/** Filtro "Todos os meses" do bloco Por perfil (parâmetro ?mes=aaaa-mm). */
export function FiltroMes({ meses }: { meses: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <>
      <label htmlFor="filtro-mes-perfis" className="sr-only">
        Mês
      </label>
      <Select
        id="filtro-mes-perfis"
        className="w-auto"
        value={params.get("mes") ?? ""}
        onChange={(e) => {
          const novo = new URLSearchParams(params);
          if (e.target.value) novo.set("mes", e.target.value);
          else novo.delete("mes");
          router.replace(`${pathname}?${novo.toString()}`, { scroll: false });
        }}
      >
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
    </>
  );
}
