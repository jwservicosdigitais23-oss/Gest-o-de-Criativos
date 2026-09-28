"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";

/** Carrossel em PDF: renderiza uma página por vez com navegação (pdf.js). */
export function CarrosselPdf({ url, nome }: { url: string; nome: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [pagina, setPagina] = useState(1);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelado = false;
    let tarefa: { destroy: () => Promise<void> } | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const loading = pdfjs.getDocument({ url });
        tarefa = loading;
        const carregado = await loading.promise;
        if (!cancelado) {
          setDoc(carregado);
          setPagina(1);
        }
      } catch {
        if (!cancelado) setErro(true);
      }
    })();
    return () => {
      cancelado = true;
      void tarefa?.destroy();
    };
  }, [url]);

  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    let tarefa: { cancel: () => void; promise: Promise<void> } | null = null;
    (async () => {
      const page = await doc.getPage(pagina);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const base = page.getViewport({ scale: 1 });
      const largura = canvas.parentElement?.clientWidth ?? 552;
      const escala = (largura / base.width) * (window.devicePixelRatio || 1);
      const viewport = page.getViewport({ scale: escala });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      tarefa = page.render({ canvas, canvasContext: ctx, viewport });
      await tarefa.promise.catch(() => undefined);
    })();
    return () => tarefa?.cancel();
  }, [doc, pagina]);

  if (erro) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-fundo p-6 text-sm font-semibold text-azul-medio">
        <FileText className="size-5" /> Abrir {nome}
      </a>
    );
  }

  const total = doc?.numPages ?? 0;
  return (
    <div className="relative bg-[#f3f2ef]">
      {!doc && (
        <div className="flex aspect-square items-center justify-center text-texto-2">
          <Loader2 className="size-6 animate-spin" aria-label="Carregando PDF" />
        </div>
      )}
      <canvas ref={canvasRef} className={doc ? "block w-full" : "hidden"} aria-label={`${nome}, página ${pagina} de ${total}`} />
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-0"
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setPagina((p) => Math.min(total, p + 1))}
            disabled={pagina === total}
            className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-0"
            aria-label="Próxima página"
          >
            <ChevronRight className="size-5" />
          </button>
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
            {pagina} / {total}
          </span>
        </>
      )}
    </div>
  );
}
