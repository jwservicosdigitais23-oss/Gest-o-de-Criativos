import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function NaoEncontrado() {
  return (
    <EmptyState
      icone={SearchX}
      titulo="Não encontrado"
      descricao="Este conteúdo não existe ou você não tem acesso a ele."
      acao={
        <Button asChild>
          <Link href="/">Voltar ao painel</Link>
        </Button>
      }
    />
  );
}
