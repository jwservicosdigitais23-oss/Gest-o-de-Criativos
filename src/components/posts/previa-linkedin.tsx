"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Earth, ExternalLink, MessageSquare, Repeat2, Send, ThumbsUp } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { CORTE_VER_MAIS } from "@/lib/constantes";
import type { TipoMidia } from "@/lib/types";
import { CarrosselPdf } from "./carrossel-pdf";

export interface MidiaPrevia {
  id: string;
  tipo: TipoMidia;
  url: string | null;
  nome: string;
}

function CarrosselImagens({ midias }: { midias: MidiaPrevia[] }) {
  const [i, setI] = useState(0);
  const atual = midias[Math.min(i, midias.length - 1)];
  if (!atual?.url) return null;
  return (
    <div className="relative bg-[#f3f2ef]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={atual.url} alt={atual.nome} className="block max-h-[640px] w-full object-contain" />
      {midias.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setI((v) => Math.max(0, v - 1))}
            disabled={i === 0}
            className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-0"
            aria-label="Imagem anterior"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setI((v) => Math.min(midias.length - 1, v + 1))}
            disabled={i === midias.length - 1}
            className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-0"
            aria-label="Próxima imagem"
          >
            <ChevronRight className="size-5" />
          </button>
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
            {i + 1} / {midias.length}
          </span>
        </>
      )}
    </div>
  );
}

function BlocoMidia({ midias }: { midias: MidiaPrevia[] }) {
  if (midias.length === 0) return null;
  const imagens = midias.filter((m) => m.tipo === "imagem" && m.url);
  const pdf = midias.find((m) => m.tipo === "pdf" && m.url);
  const video = midias.find((m) => m.tipo === "video" && m.url);
  const links = midias.filter((m) => m.tipo === "link" && m.url);

  return (
    <div className="flex flex-col">
      {video ? (
        <video src={video.url!} controls playsInline preload="metadata" className="block max-h-[640px] w-full bg-black">
          <track kind="captions" />
        </video>
      ) : pdf ? (
        <CarrosselPdf url={pdf.url!} nome={pdf.nome} />
      ) : imagens.length ? (
        <CarrosselImagens midias={imagens} />
      ) : null}
      {links.map((l) => (
        <a
          key={l.id}
          href={l.url!}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 border-t border-borda bg-[#f3f2ef] px-4 py-3 text-sm hover:bg-[#ebeae6]"
        >
          <ExternalLink className="size-4 shrink-0 text-azul-medio" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-[#191919]">{l.nome}</span>
            <span className="block truncate text-xs text-texto-2">{l.url}</span>
          </span>
        </a>
      ))}
    </div>
  );
}

/** Prévia de como o post vai aparecer no feed do LinkedIn. */
export function PreviaLinkedIn({
  perfil,
  legenda,
  midias,
  subtitulo,
}: {
  perfil: { nome: string; avatarSrc: string | null; tipo?: string };
  legenda: string;
  midias: MidiaPrevia[];
  subtitulo?: string;
}) {
  const [expandida, setExpandida] = useState(false);
  const longa = legenda.length > CORTE_VER_MAIS;
  const texto = !longa || expandida ? legenda : legenda.slice(0, CORTE_VER_MAIS).trimEnd();

  return (
    <article className="overflow-hidden rounded-[10px] border border-[#e0dfdc] bg-white font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[14px] text-[#191919] shadow-card" aria-label="Prévia do post no LinkedIn">
      <header className="flex gap-2 px-4 pt-3">
        <Avatar nome={perfil.nome} src={perfil.avatarSrc} tamanho={48} className="ring-0" />
        <div className="min-w-0 leading-tight">
          <p className="truncate font-semibold">{perfil.nome}</p>
          <p className="truncate text-xs text-[#666]">{subtitulo ?? (perfil.tipo === "empresa" ? "Página · Empresa" : "LinkedIn")}</p>
          <p className="flex items-center gap-1 text-xs text-[#666]">
            agora · <Earth className="size-3" aria-label="Público" />
          </p>
        </div>
      </header>
      <div className="whitespace-pre-wrap break-words px-4 pb-2 pt-3 leading-[1.45]">
        {legenda ? (
          <>
            {texto}
            {longa && !expandida && (
              <>
                <span>… </span>
                <button type="button" onClick={() => setExpandida(true)} className="text-[#666] hover:text-azul-medio hover:underline">
                  ver mais
                </button>
              </>
            )}
          </>
        ) : (
          <span className="text-[#999]">A legenda aparece aqui.</span>
        )}
      </div>
      <BlocoMidia midias={midias} />
      <footer className="flex justify-around border-t border-[#e0dfdc] px-2 py-1 text-[13px] font-semibold text-[#666]">
        {[
          { i: ThumbsUp, t: "Gostei" },
          { i: MessageSquare, t: "Comentar" },
          { i: Repeat2, t: "Compartilhar" },
          { i: Send, t: "Enviar" },
        ].map(({ i: Icone, t }) => (
          <span key={t} className="flex items-center gap-1.5 px-2 py-2.5">
            <Icone className="size-4" aria-hidden /> <span className="hidden sm:inline">{t}</span>
          </span>
        ))}
      </footer>
    </article>
  );
}
