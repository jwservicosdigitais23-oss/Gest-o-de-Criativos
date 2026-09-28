"use client";

import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      icone={AlertTriangle}
      titulo="Algo deu errado"
      descricao={
        <>
          Não foi possível carregar esta tela. Tente de novo.
          {error.digest && <span className="mt-2 block text-xs">Código: {error.digest}</span>}
        </>
      }
      acao={<Button onClick={reset}>Tentar de novo</Button>}
    />
  );
}
