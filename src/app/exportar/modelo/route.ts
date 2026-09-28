import { obterSessao } from "@/lib/auth";
import { CAMPOS } from "@/lib/cronograma";
import { montarXlsx, respostaXlsx } from "@/lib/exportacao";

/** Modelo vazio da planilha de importação (só o cabeçalho). */
export async function GET() {
  const { membro } = await obterSessao();
  if (!membro?.ativo) return new Response("Não autorizado", { status: 401 });
  const buffer = montarXlsx([CAMPOS.map((c) => c.rotulo)], [12, 7, 20, 40, 60, 12, 16, 24, 24, 14]);
  return respostaXlsx(buffer, "modelo-cronograma-adere.xlsx");
}
