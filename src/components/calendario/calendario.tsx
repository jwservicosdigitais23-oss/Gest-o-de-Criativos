"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { reagendarPost } from "@/app/(app)/posts/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_CLASSES, STATUS_COR, STATUS_LABEL } from "@/lib/constantes";
import { formatarData, formatarDiaCurto, formatarHora, nomeMes } from "@/lib/datas";
import type { StatusPost } from "@/lib/types";
import { cn } from "@/lib/utils";
import { navegar as navegarData } from "@/lib/calendario";

export interface PostCalendario {
  id: string;
  perfil_id: string;
  tema: string;
  status: StatusPost;
  data_publicacao: string;
  hora_publicacao: string | null;
}

export interface PerfilCalendario {
  id: string;
  nome: string;
  avatarSrc: string | null;
}

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MAX_POR_DIA = 3;

export function Calendario({
  modo,
  referencia,
  dias,
  hoje,
  posts,
  perfis,
  admin,
}: {
  modo: "mes" | "semana";
  referencia: string;
  dias: string[];
  hoje: string;
  posts: PostCalendario[];
  perfis: PerfilCalendario[];
  admin: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const [movendo, setMovendo] = useState<{ post: PostCalendario; para: string } | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const perfilPorId = new Map(perfis.map((p) => [p.id, p]));
  const selecionados = params.get("perfis")?.split(",").filter(Boolean) ?? [];
  const status = params.get("status") ?? "";
  const mesRef = Number(referencia.slice(5, 7));
  const anoRef = Number(referencia.slice(0, 4));

  const porDia = new Map<string, PostCalendario[]>();
  for (const p of posts) porDia.set(p.data_publicacao, [...(porDia.get(p.data_publicacao) ?? []), p]);

  function irPara(mudancas: Record<string, string | null>) {
    const novo = new URLSearchParams(params);
    for (const [k, v] of Object.entries(mudancas)) {
      if (v) novo.set(k, v);
      else novo.delete(k);
    }
    router.replace(`${pathname}?${novo.toString()}`, { scroll: false });
  }

  function alternarPerfil(id: string) {
    const lista = selecionados.includes(id) ? selecionados.filter((x) => x !== id) : [...selecionados, id];
    irPara({ perfis: lista.join(",") || null });
  }

  function confirmarMover() {
    if (!movendo) return;
    iniciar(async () => {
      const r = await reagendarPost(movendo.post.id, movendo.para);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(
        r.dados?.voltouParaAprovacao
          ? `Data alterada para ${formatarData(movendo.para)}. O post voltou para aprovação.`
          : `Data alterada para ${formatarData(movendo.para)}`,
      );
      setMovendo(null);
      router.refresh();
    });
  }

  const titulo =
    modo === "mes"
      ? `${nomeMes(mesRef)[0]!.toUpperCase()}${nomeMes(mesRef).slice(1)} de ${anoRef}`
      : `${formatarData(dias[0])} – ${formatarData(dias[6])}`;

  const exportarHref = `/exportar?de=${dias[0]}&ate=${dias.at(-1)}${selecionados.length ? `&perfis=${selecionados.join(",")}` : ""}`;

  function Pilula({ p }: { p: PostCalendario }) {
    const perfil = perfilPorId.get(p.perfil_id);
    const podeArrastar = admin && !["publicado", "reprovado", "arquivado"].includes(p.status);
    return (
      <Link
        href={`/posts/${p.id}`}
        draggable={podeArrastar}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", p.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        title={`${p.tema} · ${STATUS_LABEL[p.status]}`}
        className={cn(
          "flex min-w-0 items-center gap-1 rounded-full border-l-[3px] py-0.5 pl-1 pr-2 text-xs font-semibold",
          STATUS_CLASSES[p.status],
          podeArrastar && "cursor-grab active:cursor-grabbing",
        )}
        style={{ borderLeftColor: STATUS_COR[p.status] }}
      >
        {perfil && <Avatar nome={perfil.nome} src={perfil.avatarSrc} tamanho={16} className="ring-0" />}
        {p.hora_publicacao && <span className="shrink-0 opacity-80">{formatarHora(p.hora_publicacao)}</span>}
        <span className="truncate">{p.tema}</span>
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de navegação */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-[var(--radius-control)] border border-borda bg-white p-1" role="group" aria-label="Visualização">
            {(["mes", "semana"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => irPara({ modo: m === "mes" ? null : m })}
                aria-pressed={modo === m}
                className={cn(
                  "h-8 rounded-md px-3 text-sm font-semibold",
                  modo === m ? "bg-azul-medio text-white" : "text-texto-2 hover:text-azul-escuro",
                )}
              >
                {m === "mes" ? "Mês" : "Semana"}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="icon" onClick={() => irPara({ data: navegarData(modo, referencia, -1) })} aria-label="Anterior">
            <ChevronLeft />
          </Button>
          <Button variant="secondary" onClick={() => irPara({ data: null })}>
            Hoje
          </Button>
          <Button variant="secondary" size="icon" onClick={() => irPara({ data: navegarData(modo, referencia, 1) })} aria-label="Próximo">
            <ChevronRight />
          </Button>
          <h2 className="ml-1 text-lg font-bold capitalize">{titulo}</h2>
        </div>
        <Button asChild variant="secondary">
          <a href={exportarHref}>
            <Download /> Exportar cronograma
          </a>
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar perfis">
          {perfis.map((p) => {
            const ativo = selecionados.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => alternarPerfil(p.id)}
                aria-pressed={ativo}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full border pl-1 pr-3 text-sm font-semibold transition-colors",
                  ativo ? "border-azul-medio bg-st-aguardando-bg text-azul-medio" : "border-borda bg-white text-texto hover:border-azul-claro",
                )}
              >
                <Avatar nome={p.nome} src={p.avatarSrc} tamanho={26} className="ring-0" />
                {p.nome}
              </button>
            );
          })}
        </div>
        <label htmlFor="cal-status" className="sr-only">
          Status
        </label>
        <Select id="cal-status" value={status} onChange={(e) => irPara({ status: e.target.value || null })} className="sm:ml-auto sm:w-56">
          <option value="">Todos os status</option>
          {(["rascunho", "aguardando", "em_revisao", "aprovado", "publicado", "reprovado"] as StatusPost[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>

      {/* Grade (desktop / semana) */}
      <div className="hidden overflow-hidden rounded-[var(--radius-control)] border border-borda bg-white shadow-card md:block">
        <div className="grid grid-cols-7 border-b border-borda bg-fundo">
          {DIAS.map((d) => (
            <div key={d} className="rotulo px-2 py-2 text-center text-texto-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((dia) => {
            const lista = porDia.get(dia) ?? [];
            const foraDoMes = modo === "mes" && Number(dia.slice(5, 7)) !== mesRef;
            const ehHoje = dia === hoje;
            const visiveis = modo === "semana" ? lista : lista.slice(0, MAX_POR_DIA);
            const resto = lista.length - visiveis.length;
            return (
              <div
                key={dia}
                onDragOver={(e) => {
                  if (!admin) return;
                  e.preventDefault();
                  setSobre(dia);
                }}
                onDragLeave={() => setSobre((s) => (s === dia ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  setSobre(null);
                  const id = e.dataTransfer.getData("text/plain");
                  const post = posts.find((p) => p.id === id);
                  if (post && post.data_publicacao !== dia) setMovendo({ post, para: dia });
                }}
                className={cn(
                  "group relative flex flex-col gap-1 border-b border-r border-borda p-1.5 [&:nth-child(7n)]:border-r-0",
                  modo === "mes" ? "min-h-28" : "min-h-72",
                  foraDoMes && "bg-fundo/60",
                  ehHoje && "outline outline-2 -outline-offset-2 outline-azul-claro",
                  sobre === dia && "bg-st-aguardando-bg",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                      ehHoje ? "bg-azul-claro text-white" : foraDoMes ? "text-texto-2/60" : "text-azul-escuro",
                    )}
                  >
                    {Number(dia.slice(8, 10))}
                  </span>
                  {admin && (
                    <Link
                      href={`/posts/novo?data=${dia}`}
                      className={cn(
                        "flex size-6 items-center justify-center rounded-md text-texto-2 hover:bg-fundo hover:text-azul-medio",
                        lista.length > 0 && "opacity-0 group-hover:opacity-100 focus:opacity-100",
                      )}
                      aria-label={`Novo post em ${formatarData(dia)}`}
                    >
                      <Plus className="size-3.5" />
                    </Link>
                  )}
                </div>
                {visiveis.map((p) => (
                  <Pilula key={p.id} p={p} />
                ))}
                {resto > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiaAberto(dia)}
                    className="self-start rounded-full px-2 text-xs font-bold text-azul-medio hover:bg-st-aguardando-bg"
                  >
                    +{resto}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Celular: o calendário vira lista agrupada por dia */}
      {(
        <div className="flex flex-col gap-4 md:hidden">
          {dias.filter((d) => (modo === "semana" || Number(d.slice(5, 7)) === mesRef) && (porDia.get(d)?.length ?? 0) > 0).length === 0 && (
            <p className="rounded-[var(--radius-control)] border border-dashed border-borda bg-white p-8 text-center text-sm text-texto-2">
              {modo === "mes" ? "Nenhum post neste mês." : "Nenhum post nesta semana."}
            </p>
          )}
          {dias
            .filter((d) => (modo === "semana" || Number(d.slice(5, 7)) === mesRef) && (porDia.get(d)?.length ?? 0) > 0)
            .map((dia) => (
              <section key={dia}>
                <h3 className={cn("rotulo mb-1.5", dia === hoje ? "text-azul-claro" : "text-texto-2")}>
                  {dia === hoje ? "Hoje · " : ""}
                  {formatarDiaCurto(dia)}
                </h3>
                <ul className="overflow-hidden rounded-[var(--radius-control)] border border-borda bg-white">
                  {porDia.get(dia)!.map((p) => {
                    const perfil = perfilPorId.get(p.perfil_id);
                    return (
                      <li key={p.id} className="border-t border-borda first:border-t-0">
                        <Link href={`/posts/${p.id}`} className="flex min-h-14 items-center gap-3 px-3 py-2">
                          <span className="w-10 shrink-0 text-xs font-bold text-texto-2">{formatarHora(p.hora_publicacao) || "—"}</span>
                          {perfil && <Avatar nome={perfil.nome} src={perfil.avatarSrc} tamanho={28} />}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-azul-escuro">{p.tema}</span>
                            <StatusBadge status={p.status} className="mt-0.5" />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
        </div>
      )}

      <Dialog open={diaAberto !== null} onOpenChange={(v) => !v && setDiaAberto(null)}>
        {diaAberto && (
          <DialogContent titulo={formatarDiaCurto(diaAberto)} descricao={`${porDia.get(diaAberto)?.length ?? 0} posts`}>
            <ul className="flex flex-col gap-2">
              {(porDia.get(diaAberto) ?? []).map((p) => (
                <li key={p.id}>
                  <Pilula p={p} />
                </li>
              ))}
            </ul>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={movendo !== null} onOpenChange={(v) => !v && setMovendo(null)}>
        {movendo && (
          <DialogContent titulo="Mudar a data de publicação?">
            <p className="text-sm">
              <strong className="text-azul-escuro">{movendo.post.tema}</strong> sai de {formatarData(movendo.post.data_publicacao)} para{" "}
              <strong className="text-azul-escuro">{formatarData(movendo.para)}</strong>. O prazo de aprovação é recalculado.
            </p>
            {movendo.post.status === "aprovado" && (
              <p className="mt-3 rounded-[var(--radius-control)] bg-st-revisao-bg p-3 text-sm text-[#78350f]">
                Este post já está aprovado. Mudar a data <strong>o devolve para aprovação</strong> (nova versão).
              </p>
            )}
            <DialogFooter>
              <Button variant="secondary" onClick={() => setMovendo(null)}>
                Cancelar
              </Button>
              <Button onClick={confirmarMover} disabled={pendente}>
                {pendente && <Loader2 className="animate-spin" />} Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

