"use client";

import { useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, FileText, Film, Link2, Plus, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Campo, Input } from "@/components/ui/input";
import { LIMITE_UPLOAD_BYTES, LIMITE_UPLOAD_MB } from "@/lib/constantes";
import { ACCEPT_UPLOAD, avisoProporcao, caminhoMidia, formatarTamanho, tipoDoArquivo } from "@/lib/posts";
import { enviarArquivo, lerDimensoes } from "@/lib/upload";
import { cn } from "@/lib/utils";
import type { TipoMidia } from "@/lib/types";

export interface ItemMidia {
  chave: string;
  id?: string;
  tipo: TipoMidia;
  storage_path: string | null;
  url_externa: string | null;
  nome_arquivo: string;
  mime: string | null;
  tamanho: number | null;
  largura: number | null;
  altura: number | null;
  /** URL para exibir (assinada ou blob local) */
  src: string | null;
  progresso?: number;
  erro?: string;
}

function IconeTipo({ tipo }: { tipo: TipoMidia }) {
  if (tipo === "pdf") return <FileText className="size-6 text-azul-medio" />;
  if (tipo === "video") return <Film className="size-6 text-azul-medio" />;
  return <Link2 className="size-6 text-azul-medio" />;
}

export function ListaMidias({
  itens,
  onChange,
  perfilId,
  postId,
  versao,
}: {
  itens: ItemMidia[];
  onChange: (fn: (atual: ItemMidia[]) => ItemMidia[]) => void;
  perfilId: string;
  postId: string;
  versao: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [linkAberto, setLinkAberto] = useState(false);
  const [link, setLink] = useState({ url: "", nome: "" });

  async function adicionarArquivos(lista: FileList | File[]) {
    if (!perfilId) {
      toast.error("Escolha o perfil antes de enviar arquivos.");
      return;
    }
    for (const arquivo of Array.from(lista)) {
      const tipo = tipoDoArquivo(arquivo);
      if (!tipo) {
        toast.error(`${arquivo.name}: formato não aceito. Use JPG, PNG, WebP, PDF, MP4 ou MOV.`);
        continue;
      }
      if (arquivo.size > LIMITE_UPLOAD_BYTES) {
        toast.error(`${arquivo.name} tem mais de ${LIMITE_UPLOAD_MB} MB. Use “Colar link externo” (Google Drive/Canva).`);
        continue;
      }
      const chave = crypto.randomUUID();
      const caminho = caminhoMidia(perfilId, postId, versao, arquivo.name);
      const dims = tipo === "imagem" || tipo === "video" ? await lerDimensoes(arquivo, tipo) : null;
      const item: ItemMidia = {
        chave,
        tipo,
        storage_path: caminho,
        url_externa: null,
        nome_arquivo: arquivo.name,
        mime: arquivo.type || null,
        tamanho: arquivo.size,
        largura: dims?.largura ?? null,
        altura: dims?.altura ?? null,
        src: URL.createObjectURL(arquivo),
        progresso: 0,
      };
      onChange((atual) => [...atual, item]);
      const atualizar = (patch: Partial<ItemMidia>) =>
        onChange((atual) => atual.map((m) => (m.chave === chave ? { ...m, ...patch } : m)));
      try {
        await enviarArquivo(caminho, arquivo, (p) => atualizar({ progresso: p }));
        atualizar({ progresso: undefined });
      } catch (e) {
        atualizar({ erro: (e as Error).message, progresso: undefined });
        toast.error(`${arquivo.name}: ${(e as Error).message}`);
      }
    }
  }

  function mover(indice: number, delta: number) {
    onChange((atual) => {
      const novo = [...atual];
      const destino = indice + delta;
      if (destino < 0 || destino >= novo.length) return atual;
      [novo[indice], novo[destino]] = [novo[destino]!, novo[indice]!];
      return novo;
    });
  }

  function adicionarLink() {
    try {
      const u = new URL(link.url);
      if (!/^https?:$/.test(u.protocol)) throw new Error();
    } catch {
      toast.error("Cole um link válido (https://...).");
      return;
    }
    onChange((atual) => [
      ...atual,
      {
        chave: crypto.randomUUID(),
        tipo: "link",
        storage_path: null,
        url_externa: link.url,
        nome_arquivo: link.nome.trim() || new URL(link.url).hostname,
        mime: null,
        tamanho: null,
        largura: null,
        altura: null,
        src: link.url,
      },
    ]);
    setLink({ url: "", nome: "" });
    setLinkAberto(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          if (e.dataTransfer.files.length) void adicionarArquivos(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed px-4 py-8 text-center transition-colors",
          arrastando ? "border-azul-claro bg-st-aguardando-bg" : "border-borda bg-fundo",
        )}
      >
        <UploadCloud className="size-8 text-azul-medio" aria-hidden />
        <p className="text-sm font-semibold text-azul-escuro">Arraste e solte os arquivos aqui</p>
        <p className="text-xs text-texto-2">
          JPG, PNG ou WebP · PDF para carrossel · MP4 ou MOV · até {LIMITE_UPLOAD_MB} MB por arquivo
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            <Plus /> Escolher arquivos
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setLinkAberto((v) => !v)}>
            <Link2 /> Colar link externo
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_UPLOAD}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) void adicionarArquivos(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {linkAberto && (
        <div className="grid gap-3 rounded-[10px] border border-borda p-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
          <Campo label="Link (Google Drive, Canva...)" htmlFor="link-url">
            <Input id="link-url" type="url" placeholder="https://" value={link.url} onChange={(e) => setLink((l) => ({ ...l, url: e.target.value }))} />
          </Campo>
          <Campo label="Nome" htmlFor="link-nome">
            <Input id="link-nome" placeholder="Vídeo final" value={link.nome} onChange={(e) => setLink((l) => ({ ...l, nome: e.target.value }))} />
          </Campo>
          <Button type="button" onClick={adicionarLink}>Adicionar</Button>
        </div>
      )}

      {itens.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {itens.map((m, i) => {
            const aviso = avisoProporcao(m.tipo, m.largura, m.altura);
            return (
              <li key={m.chave} className={cn("flex flex-col overflow-hidden rounded-[10px] border bg-white", m.erro ? "border-vermelho" : "border-borda")}>
                <div className="relative flex aspect-square items-center justify-center bg-fundo">
                  {m.tipo === "imagem" && m.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.src} alt={m.nome_arquivo} className="size-full object-cover" />
                  ) : m.tipo === "video" && m.src ? (
                    <video src={m.src} muted playsInline preload="metadata" className="size-full object-cover" />
                  ) : (
                    <IconeTipo tipo={m.tipo} />
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-azul-escuro/80 px-2 text-[11px] font-bold text-white">{i + 1}</span>
                  {m.progresso !== undefined && (
                    <div className="absolute inset-x-0 bottom-0 bg-white/90 p-2">
                      <div className="h-1.5 overflow-hidden rounded-full bg-borda" role="progressbar" aria-valuenow={m.progresso} aria-valuemin={0} aria-valuemax={100} aria-label={`Enviando ${m.nome_arquivo}`}>
                        <div className="h-full bg-azul-claro transition-[width]" style={{ width: `${m.progresso}%` }} />
                      </div>
                      <p className="mt-1 text-center text-[11px] font-semibold text-azul-escuro">{m.progresso}%</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-2">
                  <p className="truncate text-xs font-semibold text-azul-escuro" title={m.nome_arquivo}>{m.nome_arquivo}</p>
                  <p className="text-[11px] text-texto-2">
                    {m.tipo === "link" ? "Link externo" : formatarTamanho(m.tamanho)}
                    {m.largura && m.altura ? ` · ${m.largura}×${m.altura}` : ""}
                  </p>
                  {aviso && (
                    <p className="flex gap-1 text-[11px] font-medium text-st-revisao">
                      <AlertTriangle className="mt-px size-3 shrink-0" /> {aviso}
                    </p>
                  )}
                  {m.erro && <p className="text-[11px] font-medium text-vermelho">{m.erro}</p>}
                  <div className="mt-auto flex justify-between pt-1">
                    <div className="flex">
                      <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Mover para a esquerda">
                        <ArrowLeft />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => mover(i, 1)} disabled={i === itens.length - 1} aria-label="Mover para a direita">
                        <ArrowRight />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-vermelho"
                      onClick={() => onChange((atual) => atual.filter((x) => x.chave !== m.chave))}
                      aria-label={`Remover ${m.nome_arquivo}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
