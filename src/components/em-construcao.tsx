import { Hammer } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EstadoVazio } from "@/components/estado-vazio";

export function EmConstrucao({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <>
      <CabecalhoPagina titulo={titulo} subtitulo={subtitulo} />
      <EstadoVazio
        icone={Hammer}
        titulo="Em construção"
        descricao="Esta área faz parte das próximas etapas do CRM e logo estará disponível."
      />
    </>
  );
}
