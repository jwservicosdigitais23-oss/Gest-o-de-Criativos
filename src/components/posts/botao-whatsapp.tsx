"use client";

import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Copia um texto pronto para mandar no WhatsApp a cada aprovadora. */
export function BotaoWhatsApp({ postId, tema, aprovadoras }: { postId: string; tema: string; aprovadoras: string[] }) {
  async function copiar(nome: string) {
    const link = `${window.location.origin}/posts/${postId}`;
    const texto = `Oi, ${nome.split(" ")[0]}! Tem um post para aprovar no CRM: ${tema} — ${link}`;
    await navigator.clipboard.writeText(texto);
    toast.success("Texto copiado. É só colar no WhatsApp.");
  }
  if (aprovadoras.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {aprovadoras.map((nome) => (
        <Button key={nome} variant="secondary" className="w-full" onClick={() => copiar(nome)}>
          <MessageCircle /> Copiar link para WhatsApp{aprovadoras.length > 1 ? ` (${nome.split(" ")[0]})` : ""}
        </Button>
      ))}
    </div>
  );
}
