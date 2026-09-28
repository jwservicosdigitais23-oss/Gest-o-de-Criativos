"use client";

import { BUCKET_MIDIAS } from "./constantes";
import { createClient } from "./supabase/client";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase/env";

/**
 * Upload direto do navegador para o bucket privado, com progresso.
 * Usa a API REST do Storage com o token da sessão (o RLS só deixa o admin gravar).
 */
export async function enviarArquivo(
  caminho: string,
  arquivo: File,
  aoProgredir: (pct: number) => void,
  sinal?: AbortSignal,
): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET_MIDIAS}/${caminho
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.setRequestHeader("content-type", arquivo.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) aoProgredir(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = `Falha no upload (${xhr.status}).`;
      try {
        const corpo = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        if (corpo.message?.toLowerCase().includes("maximum allowed size")) msg = "Arquivo maior que o limite do plano.";
        else if (corpo.message) msg = corpo.message;
      } catch {}
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Falha de conexão durante o upload."));
    xhr.onabort = () => reject(new Error("Upload cancelado."));
    sinal?.addEventListener("abort", () => xhr.abort());
    xhr.send(arquivo);
  });
}

/** Largura/altura de uma imagem ou vídeo local. */
export function lerDimensoes(arquivo: File, tipo: "imagem" | "video"): Promise<{ largura: number; altura: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(arquivo);
    const fim = (r: { largura: number; altura: number } | null) => {
      URL.revokeObjectURL(url);
      resolve(r);
    };
    if (tipo === "imagem") {
      const img = new Image();
      img.onload = () => fim({ largura: img.naturalWidth, altura: img.naturalHeight });
      img.onerror = () => fim(null);
      img.src = url;
    } else {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => fim(v.videoWidth ? { largura: v.videoWidth, altura: v.videoHeight } : null);
      v.onerror = () => fim(null);
      v.src = url;
    }
  });
}
