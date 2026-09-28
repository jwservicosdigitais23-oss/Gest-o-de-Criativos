"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Send, Save } from "lucide-react";
import { toast } from "sonner";
import { salvarPost } from "@/app/(app)/posts/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Campo, Input, Select, Textarea } from "@/components/ui/input";
import { CONFLITO } from "@/lib/acoes";
import { FORMATO_LABEL, LIMITE_LEGENDA } from "@/lib/constantes";
import { prazoPadrao } from "@/lib/datas";
import type { Formato, StatusPost } from "@/lib/types";
import { postSchema } from "@/lib/validacao";
import { cn } from "@/lib/utils";
import { ListaMidias, type ItemMidia } from "./lista-midias";
import { PreviaLinkedIn } from "./previa-linkedin";

export interface PerfilOpcao {
  id: string;
  nome: string;
  avatarSrc: string | null;
  tipo: string;
}

export interface PostInicial {
  id: string;
  perfil_id: string;
  status: StatusPost;
  versao: number;
  data_publicacao: string;
  hora_publicacao: string | null;
  tema: string;
  legenda: string;
  formato: Formato;
  pilar: string | null;
  cta: string | null;
  prazo_aprovacao: string | null;
  updated_at: string;
}

type Erros = Partial<Record<"perfil_id" | "data_publicacao" | "tema" | "legenda" | "hora_publicacao" | "prazo_aprovacao", string>>;

export function FormPost({
  perfis,
  post,
  midiasIniciais,
  versaoEdicao,
  padrao,
}: {
  perfis: PerfilOpcao[];
  post: PostInicial | null;
  midiasIniciais: ItemMidia[];
  versaoEdicao: number;
  padrao?: { perfil_id?: string; data_publicacao?: string };
}) {
  const router = useRouter();
  const [id] = useState(() => post?.id ?? crypto.randomUUID());
  const [perfilId, setPerfilId] = useState(post?.perfil_id ?? padrao?.perfil_id ?? (perfis.length === 1 ? perfis[0]!.id : ""));
  const [data, setData] = useState(post?.data_publicacao ?? padrao?.data_publicacao ?? "");
  const [hora, setHora] = useState(post?.hora_publicacao?.slice(0, 5) ?? "");
  const [tema, setTema] = useState(post?.tema ?? "");
  const [legenda, setLegenda] = useState(post?.legenda ?? "");
  const [formato, setFormato] = useState<Formato>(post?.formato ?? "imagem");
  const [pilar, setPilar] = useState(post?.pilar ?? "");
  const [cta, setCta] = useState(post?.cta ?? "");
  const [prazo, setPrazo] = useState(post?.prazo_aprovacao ?? (padrao?.data_publicacao ? prazoPadrao(padrao.data_publicacao) : ""));
  const [prazoManual, setPrazoManual] = useState(Boolean(post?.prazo_aprovacao));
  const [midias, setMidias] = useState<ItemMidia[]>(midiasIniciais);
  const [erros, setErros] = useState<Erros>({});
  const [pendente, iniciar] = useTransition();
  const [acao, setAcao] = useState<"salvar" | "enviar" | null>(null);

  const status = post?.status ?? "rascunho";
  const jaEnviado = status === "aguardando" || status === "aprovado";
  const perfil = perfis.find((p) => p.id === perfilId);
  const enviando = midias.some((m) => m.progresso !== undefined);
  const comErro = midias.some((m) => m.erro);

  const midiasPrevia = useMemo(
    () =>
      midias
        .filter((m) => !m.erro)
        .map((m) => ({ id: m.chave, tipo: m.tipo, url: m.src, nome: m.nome_arquivo })),
    [midias],
  );

  function mudarData(v: string) {
    setData(v);
    if (!prazoManual && /^\d{4}-\d{2}-\d{2}$/.test(v)) setPrazo(prazoPadrao(v));
  }

  function submeter(enviar: boolean) {
    const dados = {
      id,
      perfil_id: perfilId,
      data_publicacao: data,
      hora_publicacao: hora,
      tema,
      legenda,
      formato,
      pilar,
      cta,
      prazo_aprovacao: prazo,
      updated_at: post?.updated_at ?? null,
    };
    const parsed = postSchema.safeParse(dados);
    if (!parsed.success) {
      const novos: Erros = {};
      for (const issue of parsed.error.issues) {
        const campo = issue.path[0] as keyof Erros;
        if (!novos[campo]) novos[campo] = issue.message;
      }
      setErros(novos);
      toast.error("Revise os campos destacados.");
      return;
    }
    setErros({});
    if (enviando) return toast.error("Aguarde o fim do envio dos arquivos.");
    if (comErro) return toast.error("Remova os arquivos com erro antes de salvar.");
    if ((enviar || jaEnviado) && formato !== "texto" && midias.length === 0) {
      return toast.error("Adicione ao menos uma mídia para enviar para aprovação (exceto formato Texto).");
    }

    setAcao(enviar ? "enviar" : "salvar");
    iniciar(async () => {
      const r = await salvarPost(
        dados,
        midias.map((m) => ({
          id: m.id,
          tipo: m.tipo,
          storage_path: m.storage_path,
          url_externa: m.url_externa,
          nome_arquivo: m.nome_arquivo,
          mime: m.mime,
          tamanho: m.tamanho,
          largura: m.largura,
          altura: m.altura,
        })),
        enviar,
      );
      setAcao(null);
      if (!r.ok) {
        if (r.erro === CONFLITO) {
          toast.error(r.erro, { action: { label: "Recarregar", onClick: () => window.location.reload() }, duration: 10000 });
        } else {
          toast.error(r.erro);
        }
        return;
      }
      toast.success(
        enviar || jaEnviado
          ? status === "em_revisao" || jaEnviado
            ? `Nova versão enviada para aprovação`
            : "Post enviado para aprovação"
          : post
            ? "Alterações salvas"
            : "Rascunho salvo",
      );
      router.push(`/posts/${id}`);
      router.refresh();
    });
  }

  const contador = legenda.length;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submeter(true);
        }}
        className="flex min-w-0 flex-col gap-6"
        noValidate
      >
        {status !== "rascunho" && (
          <div
            className={cn(
              "flex gap-3 rounded-[10px] p-4 text-sm",
              jaEnviado ? "bg-st-revisao-bg text-st-revisao" : "bg-st-aguardando-bg text-st-aguardando",
            )}
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              {jaEnviado
                ? `Este post está ${status === "aprovado" ? "aprovado" : "aguardando aprovação"}. Salvar cria a versão v${versaoEdicao} e o devolve para Aguardando aprovação.`
                : `Os ajustes formam a versão v${versaoEdicao}. As aprovadoras só veem a nova versão quando você reenviar.`}
            </p>
          </div>
        )}

        <Card className="flex flex-col gap-5 p-5">
          <h2 className="text-base font-bold">Informações do post</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Perfil *" htmlFor="perfil" erro={erros.perfil_id}>
              <Select id="perfil" value={perfilId} onChange={(e) => setPerfilId(e.target.value)} aria-invalid={Boolean(erros.perfil_id)}>
                <option value="">Escolha o perfil</option>
                {perfis.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </Select>
            </Campo>
            <Campo label="Formato" htmlFor="formato">
              <Select id="formato" value={formato} onChange={(e) => setFormato(e.target.value as Formato)}>
                {Object.entries(FORMATO_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Campo>
            <Campo label="Data de publicação *" htmlFor="data" erro={erros.data_publicacao}>
              <Input id="data" type="date" value={data} onChange={(e) => mudarData(e.target.value)} aria-invalid={Boolean(erros.data_publicacao)} />
            </Campo>
            <Campo label="Hora" htmlFor="hora" erro={erros.hora_publicacao}>
              <Input id="hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </Campo>
          </div>
          <Campo label="Tema *" htmlFor="tema" erro={erros.tema}>
            <Input id="tema" value={tema} onChange={(e) => setTema(e.target.value)} maxLength={300} placeholder="Ex.: Liderança em tempos de mudança" aria-invalid={Boolean(erros.tema)} />
          </Campo>
          <Campo
            label="Legenda (o texto que vai para o LinkedIn)"
            htmlFor="legenda"
            erro={erros.legenda}
          >
            <Textarea
              id="legenda"
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              rows={10}
              aria-invalid={contador > LIMITE_LEGENDA}
              aria-describedby="contador-legenda"
            />
            <p id="contador-legenda" className={cn("self-end text-xs font-semibold", contador > LIMITE_LEGENDA ? "text-vermelho" : "text-texto-2")}>
              {contador.toLocaleString("pt-BR")} / {LIMITE_LEGENDA.toLocaleString("pt-BR")}
            </p>
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Pilar" htmlFor="pilar">
              <Input id="pilar" value={pilar} onChange={(e) => setPilar(e.target.value)} placeholder="Ex.: Autoridade" />
            </Campo>
            <Campo label="CTA" htmlFor="cta">
              <Input id="cta" value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Ex.: Comente sua experiência" />
            </Campo>
            <Campo label="Prazo de aprovação" htmlFor="prazo" ajuda="Padrão: 2 dias úteis antes da publicação." erro={erros.prazo_aprovacao}>
              <Input
                id="prazo"
                type="date"
                value={prazo}
                onChange={(e) => {
                  setPrazo(e.target.value);
                  setPrazoManual(true);
                }}
              />
            </Campo>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <div>
            <h2 className="text-base font-bold">Mídia</h2>
            <p className="text-sm text-texto-2">
              {formato === "texto" ? "Opcional para posts só de texto." : "Obrigatória para enviar para aprovação."}
            </p>
          </div>
          <ListaMidias itens={midias} onChange={setMidias} perfilId={perfilId} postId={id} versao={versaoEdicao} />
        </Card>

        <div className="sticky bottom-20 z-10 flex flex-col-reverse gap-2 rounded-[10px] border border-borda bg-white/95 p-3 shadow-card backdrop-blur sm:flex-row sm:justify-end lg:bottom-4">
          <Button type="button" variant="secondary" onClick={() => router.back()} disabled={pendente}>
            Cancelar
          </Button>
          {!jaEnviado && (
            <Button type="button" variant="secondary" onClick={() => submeter(false)} disabled={pendente || enviando}>
              {acao === "salvar" ? <Loader2 className="animate-spin" /> : <Save />}
              {status === "em_revisao" ? "Salvar ajustes" : "Salvar rascunho"}
            </Button>
          )}
          <Button type="submit" disabled={pendente || enviando}>
            {acao === "enviar" ? <Loader2 className="animate-spin" /> : <Send />}
            {jaEnviado ? "Salvar e reenviar" : status === "em_revisao" ? `Reenviar para aprovação (v${versaoEdicao})` : "Enviar para aprovação"}
          </Button>
        </div>
      </form>

      <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
        <p className="rotulo mb-2 text-texto-2">Prévia no LinkedIn</p>
        <PreviaLinkedIn
          perfil={{ nome: perfil?.nome ?? "Perfil", avatarSrc: perfil?.avatarSrc ?? null, tipo: perfil?.tipo }}
          legenda={legenda}
          midias={midiasPrevia}
        />
      </aside>
    </div>
  );
}
