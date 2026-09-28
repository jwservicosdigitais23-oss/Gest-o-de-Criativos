import { MessageSquareWarning } from "lucide-react";
import { ITENS_REVISAO } from "@/lib/constantes";

const LABEL_ITEM = Object.fromEntries(ITENS_REVISAO.map((i) => [i.valor, i.label]));

/** Observações pedidas numa versão — mostradas ao lado da nova versão para conferir o ajuste. */
export function ObservacoesAnteriores({
  itens,
  versao,
}: {
  itens: { id: string; autor: string; decisao: string; observacao: string; itens: string[] }[];
  versao: number;
}) {
  return (
    <div className="rounded-[10px] border border-[#fcd34d] bg-st-revisao-bg p-4 text-sm text-[#78350f]">
      <p className="mb-2 flex items-center gap-2 font-bold">
        <MessageSquareWarning className="size-4" aria-hidden /> O que foi pedido na v{versao}
      </p>
      <ul className="flex flex-col gap-3">
        {itens.map((o) => (
          <li key={o.id}>
            <p className="text-xs font-semibold">
              {o.autor}
              {o.itens.length > 0 && ` · ${o.itens.map((i) => LABEL_ITEM[i] ?? i).join(", ")}`}
            </p>
            <p className="whitespace-pre-wrap">{o.observacao}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
