import type { Metadata } from "next";
import { Download, History } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ImportarCronograma } from "@/components/importar/importar-cronograma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { exigirAdmin } from "@/lib/auth";
import type { PostExistente } from "@/lib/cronograma";
import { formatarDataHora } from "@/lib/datas";
import type { Importacao } from "@/lib/types";

export const metadata: Metadata = { title: "Importar cronograma" };

export default async function ImportarPage() {
  const { supabase } = await exigirAdmin();
  const [{ data: perfis }, { data: existentes }, { data: historico }, { data: membros }] = await Promise.all([
    supabase.from("perfis").select("id, nome").eq("arquivado", false).order("ordem"),
    supabase.from("posts").select("id, perfil_id, data_publicacao, tema, chave_externa, status").returns<PostExistente[]>(),
    supabase.from("importacoes").select("*").order("created_at", { ascending: false }).limit(20).returns<Importacao[]>(),
    supabase.from("membros").select("id, nome"),
  ]);
  const nome = new Map((membros ?? []).map((m) => [m.id as string, m.nome as string]));

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        titulo="Importar cronograma"
        subtitulo="Suba o Excel e o CRM cria os posts nas datas certas."
        acoes={
          <>
            <Button asChild variant="secondary">
              <a href="/exportar/modelo">
                <Download /> Baixar modelo .xlsx
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a href="/exportar">
                <Download /> Exportar cronograma
              </a>
            </Button>
          </>
        }
      />
      <ImportarCronograma perfis={perfis ?? []} existentes={existentes ?? []} />

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
          <History className="size-4 text-texto-2" /> Histórico de importações
        </h2>
        {(historico ?? []).length === 0 ? (
          <p className="text-sm text-texto-2">Nenhuma importação ainda.</p>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-fundo">
                <tr className="rotulo text-texto-2">
                  <th className="px-4 py-3">Quando</th>
                  <th className="px-4">Arquivo</th>
                  <th className="px-4">Por</th>
                  <th className="px-4 text-right">Criados</th>
                  <th className="px-4 text-right">Atualizados</th>
                  <th className="px-4 text-right">Ignorados</th>
                  <th className="px-4 text-right">Erros</th>
                </tr>
              </thead>
              <tbody>
                {(historico ?? []).map((h) => (
                  <tr key={h.id} className="border-t border-borda">
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatarDataHora(h.created_at)}</td>
                    <td className="max-w-56 truncate px-4 font-medium text-azul-escuro">{h.arquivo_nome}</td>
                    <td className="px-4">{h.autor_id ? nome.get(h.autor_id) : "—"}</td>
                    <td className="px-4 text-right">{h.criados}</td>
                    <td className="px-4 text-right">{h.atualizados}</td>
                    <td className="px-4 text-right">{h.ignorados}</td>
                    <td className={h.erros ? "px-4 text-right font-bold text-vermelho" : "px-4 text-right"}>{h.erros}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
