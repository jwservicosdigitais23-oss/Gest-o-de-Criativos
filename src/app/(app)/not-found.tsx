import Link from "next/link";
import { SearchX } from "lucide-react";
import { EstadoVazio } from "@/components/estado-vazio";
import { Button } from "@/components/ui/button";

export default function NaoEncontrado() {
  return (
    <EstadoVazio
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
