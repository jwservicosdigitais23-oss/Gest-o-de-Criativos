import { EmConstrucao } from "@/components/em-construcao";
import { exigirMembro } from "@/lib/auth";
import { saudacao } from "@/lib/datas";

export default async function PainelPage() {
  const { membro } = await exigirMembro();
  return (
    <EmConstrucao
      titulo={`${saudacao()}, ${membro.nome.split(" ")[0]}`}
      subtitulo="Aqui está o status dos seus criativos hoje."
    />
  );
}
