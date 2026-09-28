"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Paperclip, RotateCcw, Send, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import {
  anexarMidia,
  enviarImportadosComMidia,
  importarCronograma,
  type ResumoImportacao,
} from "@/app/(app)/importar/actions";
import { Pilula } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Campo, Select } from "@/components/ui/input";
import {
  CAMPOS,
  analisarLinhas,
  detectarMapeamento,
  faltandoObrigatorios,
  lerPlanilha,
  normalizar,
  type LinhaAnalisada,
  type Mapeamento,
  type PostExistente,
  type Situacao,
} from "@/lib/cronograma";
import { LIMITE_UPLOAD_BYTES, LIMITE_UPLOAD_MB } from "@/lib/constantes";
import { formatarData, hojeISO } from "@/lib/datas";
import { caminhoMidia, tipoDoArquivo } from "@/lib/posts";
import { enviarArquivo, lerDimensoes } from "@/lib/upload";
import { cn } from "@/lib/utils";

const SELO: Record<Situacao, { rotulo: string; classe: string }> = {
  novo: { rotulo: "Novo", classe: "bg-st-aguardando-bg text-st-aguardando-text" },
  atualiza: { rotulo: "Atualiza", classe: "bg-[#e0f6fd] text-[#00709a]" },
  ignorada: { rotulo: "Ignorada", classe: "bg-st-rascunho-bg text-st-rascunho-text" },
  erro: { rotulo: "Erro", classe: "bg-st-reprovado-bg text-st-reprovado-text" },
};

type Etapa = "upload" | "mapeamento" | "previa" | "resumo";

export function ImportarCronograma({
  perfis,
  existentes,
}: {
  perfis: { id: string; nome: string }[];
  existentes: PostExistente[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [arrastando, setArrastando] = useState(false);
  const [arquivo, setArquivo] = useState("");
  const [cabecalho, setCabecalho] = useState<string[]>([]);
  const [linhas, setLinhas] = useState<unknown[][]>([]);
  const [mapa, setMapa] = useState<Mapeamento | null>(null);
  const [confirmaPassado, setConfirmaPassado] = useState(false);
  const [resumo, setResumo] = useState<ResumoImportacao | null>(null);
  const [pendente, iniciar] = useTransition();

  const analise: LinhaAnalisada[] = useMemo(
    () => (mapa && etapa !== "upload" && etapa !== "mapeamento" ? analisarLinhas(linhas, mapa, perfis, existentes, hojeISO()) : []),
    [mapa, linhas, perfis, existentes, etapa],
  );
  const aGravar = analise.filter((l) => l.situacao === "novo" || l.situacao === "atualiza");
  const temPassado = aGravar.some((l) => l.dataPassada);
  const contagem = (s: Situacao) => analise.filter((l) => l.situacao === s).length;

  async function lerArquivo(f: File) {
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      toast.error("Envie um arquivo .xlsx ou .csv.");
      return;
    }
    try {
      const { cabecalho: cab, linhas: lin } = lerPlanilha(await f.arrayBuffer());
      if (cab.length === 0) {
        toast.error("A primeira aba está vazia.");
        return;
      }
      const m = detectarMapeamento(cab);
      setArquivo(f.name);
      setCabecalho(cab);
      setLinhas(lin);
      setMapa(m);
      setConfirmaPassado(false);
      setEtapa(faltandoObrigatorios(m).length ? "mapeamento" : "previa");
    } catch {
      toast.error("Não foi possível ler a planilha. Confira se o arquivo não está corrompido.");
    }
  }

  function importar() {
    if (temPassado && !confirmaPassado) {
      toast.error("Confirme a importação de posts com data no passado.");
      return;
    }
    iniciar(async () => {
      const r = await importarCronograma(
        arquivo,
        aGravar.map((l) => ({
          linha: l.linha,
          chave_externa: l.dados.chave_externa,
          perfil_id: l.dados.perfil_id!,
          data: l.dados.data!,
          hora: l.dados.hora,
          tema: l.dados.tema,
          legenda: l.dados.legenda,
          formato: l.dados.formato,
          pilar: l.dados.pilar,
          cta: l.dados.cta,
          arquivo: l.dados.arquivo,
        })),
        analise
          .filter((l) => l.situacao === "erro")
          .map((l) => ({ linha: l.linha, resultado: "erro", motivo: l.motivo })),
      );
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      setResumo(r.dados!);
      setEtapa("resumo");
      toast.success(`Importação concluída: ${r.dados!.criados} criado(s), ${r.dados!.atualizados} atualizado(s).`);
      router.refresh();
    });
  }

  function recomecar() {
    setEtapa("upload");
    setResumo(null);
    setMapa(null);
    setLinhas([]);
    setCabecalho([]);
  }

  if (etapa === "upload") {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          const f = e.dataTransfer.files[0];
          if (f) void lerArquivo(f);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-[var(--radius-control)] border-2 border-dashed bg-surface-solid px-6 py-16 text-center",
          arrastando ? "border-azul-claro bg-st-aguardando-bg" : "border-borda",
        )}
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-st-aguardando-bg text-azul-medio">
          <FileSpreadsheet className="size-7" aria-hidden />
        </span>
        <p className="text-lg font-bold text-azul-escuro">Arraste o cronograma aqui</p>
        <p className="max-w-md text-sm text-texto-2">
          Arquivo .xlsx ou .csv, cabeçalho na linha 1: Data · Hora · Perfil · Tema · Legenda · Formato · Pilar · CTA · Arquivo · ID.
          Nada é gravado antes da sua confirmação.
        </p>
        <Button onClick={() => inputRef.current?.click()}>
          <UploadCloud /> Escolher arquivo
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void lerArquivo(f);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  if (etapa === "mapeamento" && mapa) {
    const faltando = faltandoObrigatorios(mapa);
    return (
      <GlassCard className="flex flex-col gap-5 p-5">
        <div>
          <h2 className="text-lg font-bold">Mapear colunas</h2>
          <p className="text-sm text-texto-2">
            Não reconhecemos todas as colunas obrigatórias de <strong>{arquivo}</strong>. Diga qual coluna do Excel corresponde a cada
            campo do CRM.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAMPOS.map((c) => (
            <Campo key={c.campo} label={`${c.rotulo}${c.obrigatorio ? " *" : ""}`} htmlFor={`map-${c.campo}`}>
              <Select
                id={`map-${c.campo}`}
                value={mapa[c.campo] ?? ""}
                onChange={(e) => setMapa({ ...mapa, [c.campo]: e.target.value === "" ? null : Number(e.target.value) })}
                aria-invalid={c.obrigatorio && mapa[c.campo] == null}
              >
                <option value="">— não usar —</option>
                {cabecalho.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Coluna ${i + 1}`}
                  </option>
                ))}
              </Select>
            </Campo>
          ))}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={recomecar}>
            Trocar arquivo
          </Button>
          <Button disabled={faltando.length > 0} onClick={() => setEtapa("previa")}>
            Continuar para a pré-visualização
          </Button>
        </div>
      </GlassCard>
    );
  }

  if (etapa === "previa") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-azul-escuro">{arquivo}</p>
            <p className="flex flex-wrap gap-2 text-sm text-texto-2">
              {(["novo", "atualiza", "ignorada", "erro"] as Situacao[]).map((s) => (
                <Pilula key={s} className={SELO[s].classe}>
                  {SELO[s].rotulo}: {contagem(s)}
                </Pilula>
              ))}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={recomecar}>
              <RotateCcw /> Trocar arquivo
            </Button>
            <Button onClick={importar} disabled={pendente || aGravar.length === 0 || (temPassado && !confirmaPassado)}>
              {pendente && <Loader2 className="animate-spin" />} Importar {aGravar.length} posts
            </Button>
          </div>
        </div>

        {temPassado && (
          <label className="flex items-start gap-3 rounded-[var(--radius-control)] border border-[#fcd34d] bg-st-revisao-bg p-3 text-sm text-[#78350f]">
            <Checkbox checked={confirmaPassado} onChange={(e) => setConfirmaPassado(e.target.checked)} className="mt-0.5" />
            <span>
              Algumas linhas têm <strong>data no passado</strong>. Confirmo que quero importá-las mesmo assim.
            </span>
          </label>
        )}

        <GlassCard className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-fundo">
              <tr className="rotulo text-texto-2">
                <th className="px-3 py-3">Linha</th>
                <th className="px-3">Situação</th>
                <th className="px-3">Data</th>
                <th className="px-3">Perfil</th>
                <th className="px-3">Tema</th>
                <th className="px-3">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {analise.map((l) => (
                <tr key={l.linha} className="border-t border-borda align-top">
                  <td className="px-3 py-2.5 font-semibold text-texto-2">{l.linha}</td>
                  <td className="px-3 py-2.5">
                    <Pilula className={SELO[l.situacao].classe}>{SELO[l.situacao].rotulo}</Pilula>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {l.dados.data ? formatarData(l.dados.data) : "—"}
                    {l.dados.hora && <span className="text-texto-2"> {l.dados.hora}</span>}
                  </td>
                  <td className="px-3 py-2.5">{l.dados.perfil_nome || "—"}</td>
                  <td className="max-w-64 truncate px-3 py-2.5 font-medium text-azul-escuro" title={l.dados.tema}>
                    {l.dados.tema || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {l.motivo && (
                      <p className={l.situacao === "erro" ? "text-vermelho" : "text-texto-2"}>
                        {l.motivo}
                        {l.perfilDesconhecido && (
                          <>
                            {" · "}
                            <Link href="/configuracoes?aba=perfis" target="_blank" className="font-semibold text-azul-medio underline">
                              Criar perfil agora
                            </Link>
                          </>
                        )}
                      </p>
                    )}
                    {l.avisos.map((a) => (
                      <p key={a} className="flex items-center gap-1 text-st-revisao-text">
                        <AlertTriangle className="size-3.5 shrink-0" /> {a}
                      </p>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
        {analise.some((l) => l.perfilDesconhecido) && (
          <p className="text-sm text-texto-2">
            Criou o perfil em outra aba? <button type="button" className="font-semibold text-azul-medio underline" onClick={() => router.refresh()}>Atualizar a lista de perfis</button>.
          </p>
        )}
      </div>
    );
  }

  return resumo ? <Resumo resumo={resumo} analise={analise} onNova={recomecar} /> : null;
}

function Resumo({ resumo, analise, onNova }: { resumo: ResumoImportacao; analise: LinhaAnalisada[]; onNova: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendente, iniciar] = useTransition();
  const [anexos, setAnexos] = useState<Record<string, string>>({}); // post_id → nome
  const [enviando, setEnviando] = useState<string | null>(null);

  // post importado → linha analisada (perfil + nome do arquivo esperado)
  const porPost = useMemo(() => {
    const mapa = new Map<string, LinhaAnalisada>();
    for (const d of resumo.detalhes) {
      if (!d.post_id || (d.resultado !== "criado" && d.resultado !== "atualizado")) continue;
      const l = analise.find((x) => x.linha === d.linha);
      if (l) mapa.set(d.post_id, l);
    }
    return mapa;
  }, [resumo, analise]);

  const esperados = [...porPost.entries()].filter(([, l]) => l.dados.arquivo);

  function acharPost(nome: string) {
    const alvo = normalizar(nome);
    const semExt = alvo.replace(/\.[^.]+$/, "");
    return esperados.find(([, l]) => {
      const a = normalizar(l.dados.arquivo);
      return a === alvo || a.replace(/\.[^.]+$/, "") === semExt;
    });
  }

  async function soltar(arquivos: FileList | File[]) {
    for (const f of Array.from(arquivos)) {
      const achado = acharPost(f.name);
      if (!achado) {
        toast.error(`${f.name}: nenhum post com esse nome na coluna Arquivo.`);
        continue;
      }
      const tipo = tipoDoArquivo(f);
      if (!tipo) {
        toast.error(`${f.name}: formato não aceito.`);
        continue;
      }
      if (f.size > LIMITE_UPLOAD_BYTES) {
        toast.error(`${f.name}: maior que ${LIMITE_UPLOAD_MB} MB. Anexe como link externo no post.`);
        continue;
      }
      const [postId, linha] = achado;
      const caminho = caminhoMidia(linha.dados.perfil_id!, postId, 1, f.name);
      setEnviando(f.name);
      try {
        const dims = tipo === "imagem" || tipo === "video" ? await lerDimensoes(f, tipo) : null;
        await enviarArquivo(caminho, f, () => undefined);
        const r = await anexarMidia(postId, {
          tipo,
          storage_path: caminho,
          nome_arquivo: f.name,
          mime: f.type || null,
          tamanho: f.size,
          largura: dims?.largura ?? null,
          altura: dims?.altura ?? null,
        });
        if (!r.ok) throw new Error(r.erro);
        setAnexos((a) => ({ ...a, [postId]: f.name }));
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message}`);
      }
    }
    setEnviando(null);
  }

  function enviarAprovacao() {
    iniciar(async () => {
      const r = await enviarImportadosComMidia([...porPost.keys()]);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(
        `${r.dados!.enviados} post(s) enviados para aprovação${r.dados!.semMidia ? ` · ${r.dados!.semMidia} ainda sem mídia` : ""}.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-8 text-verde" aria-hidden />
          <div>
            <h2 className="text-lg font-bold">Importação concluída</h2>
            <p className="text-sm text-texto-2">Os posts entraram como Rascunho.</p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { r: "Criados", v: resumo.criados, c: SELO.novo.classe },
            { r: "Atualizados", v: resumo.atualizados, c: SELO.atualiza.classe },
            { r: "Ignorados", v: resumo.ignorados, c: SELO.ignorada.classe },
            { r: "Erros", v: resumo.erros, c: SELO.erro.classe },
          ].map((x) => (
            <div key={x.r} className={cn("rounded-[var(--radius-control)] p-3", x.c)}>
              <dt className="text-xs font-semibold">{x.r}</dt>
              <dd className="text-2xl font-bold">{x.v}</dd>
            </div>
          ))}
        </dl>
        {resumo.detalhes.some((d) => d.resultado === "erro") && (
          <ul className="mt-4 flex flex-col gap-1 text-sm text-vermelho">
            {resumo.detalhes
              .filter((d) => d.resultado === "erro")
              .map((d) => (
                <li key={d.linha}>
                  Linha {d.linha}: {d.motivo}
                </li>
              ))}
          </ul>
        )}
      </GlassCard>

      {esperados.length > 0 && (
        <GlassCard className="flex flex-col gap-4 p-5">
          <div>
            <h2 className="text-base font-bold">Soltar mídias</h2>
            <p className="text-sm text-texto-2">
              Solte os arquivos de uma vez: cada um vai para o post cuja coluna Arquivo tem o mesmo nome.
            </p>
          </div>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void soltar(e.dataTransfer.files);
            }}
            className="flex flex-col items-center gap-2 rounded-[var(--radius-control)] border-2 border-dashed border-borda bg-fundo px-4 py-8 text-center"
          >
            <Paperclip className="size-6 text-azul-medio" aria-hidden />
            <p className="text-sm font-semibold text-azul-escuro">Arraste as mídias aqui</p>
            <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={Boolean(enviando)}>
              {enviando ? <Loader2 className="animate-spin" /> : <UploadCloud />}
              {enviando ? `Enviando ${enviando}…` : "Escolher arquivos"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.length) void soltar(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
          <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
            {esperados.map(([postId, l]) => (
              <li key={postId} className="flex items-center gap-2">
                {anexos[postId] ? (
                  <CheckCircle2 className="size-4 shrink-0 text-verde" />
                ) : (
                  <span className="size-4 shrink-0 rounded-full border-2 border-borda" />
                )}
                <span className="truncate">
                  <strong className="text-azul-escuro">{l.dados.arquivo}</strong> → {l.dados.tema}
                </span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onNova}>
          Importar outra planilha
        </Button>
        <Button onClick={enviarAprovacao} disabled={pendente || porPost.size === 0}>
          {pendente ? <Loader2 className="animate-spin" /> : <Send />} Enviar para aprovação os que já têm mídia
        </Button>
      </div>
    </div>
  );
}
