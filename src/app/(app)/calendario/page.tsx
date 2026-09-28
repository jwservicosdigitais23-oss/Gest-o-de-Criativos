import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Calendario, type PostCalendario } from "@/components/calendario/calendario";
import { exigirMembro } from "@/lib/auth";
import { gradeDoMes, semanaDe } from "@/lib/calendario";
import { carregarPerfis } from "@/lib/consultas";
import { hojeISO } from "@/lib/datas";

export const metadata: Metadata = { title: "Calendário" };

export default async function CalendarioPage(props: PageProps<"/calendario">) {
  const sp = await props.searchParams;
  const { supabase, membro } = await exigirMembro();
  const hoje = hojeISO();
  const modo = sp.modo === "semana" ? "semana" : "mes";
  const referencia = typeof sp.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) ? sp.data : hoje;
  const dias =
    modo === "mes" ? gradeDoMes(Number(referencia.slice(0, 4)), Number(referencia.slice(5, 7))) : semanaDe(referencia);

  const perfisSel = typeof sp.perfis === "string" ? sp.perfis.split(",").filter((x) => /^[0-9a-f-]{36}$/i.test(x)) : [];
  const status = typeof sp.status === "string" ? sp.status : "";

  // Datas são "date" puras (sem fuso): o intervalo em texto não sofre conversão de UTC.
  let q = supabase
    .from("posts")
    .select("id, perfil_id, tema, status, data_publicacao, hora_publicacao")
    .gte("data_publicacao", dias[0]!)
    .lte("data_publicacao", dias.at(-1)!)
    .neq("status", "arquivado")
    .order("data_publicacao")
    .order("hora_publicacao", { nullsFirst: true });
  if (perfisSel.length) q = q.in("perfil_id", perfisSel);
  if (status) q = q.eq("status", status);

  const [{ data: posts }, perfis] = await Promise.all([q.returns<PostCalendario[]>(), carregarPerfis(supabase)]);

  return (
    <>
      <CabecalhoPagina titulo="Calendário" subtitulo="Tudo o que vai ao ar, por data e por perfil." />
      <Calendario
        modo={modo}
        referencia={referencia}
        dias={dias}
        hoje={hoje}
        posts={posts ?? []}
        perfis={perfis.map((p) => ({ id: p.id, nome: p.nome, avatarSrc: p.avatarSrc }))}
        admin={membro.papel === "admin"}
      />
    </>
  );
}
