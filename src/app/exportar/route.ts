import type { NextRequest } from "next/server";
import { obterSessao } from "@/lib/auth";
import { hojeISO } from "@/lib/datas";
import { gerarCronogramaXlsx, respostaXlsx } from "@/lib/exportacao";

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;

/** GET /exportar?perfil=<id>&de=aaaa-mm-dd&ate=aaaa-mm-dd&perfis=<id>,<id> — respeita o RLS. */
export async function GET(request: NextRequest) {
  const { supabase, membro } = await obterSessao();
  if (!membro?.ativo) return new Response("Não autorizado", { status: 401 });
  const p = request.nextUrl.searchParams;
  const perfilId = p.get("perfil");
  const de = p.get("de");
  const ate = p.get("ate");
  const perfis = p.get("perfis")?.split(",").filter((x) => UUID.test(x)) ?? null;
  const buffer = await gerarCronogramaXlsx(supabase, {
    perfilId: perfilId && UUID.test(perfilId) ? perfilId : null,
    de: de && DATA.test(de) ? de : null,
    ate: ate && DATA.test(ate) ? ate : null,
    perfis,
  });
  return respostaXlsx(buffer, `cronograma-adere-${hojeISO()}.xlsx`);
}
