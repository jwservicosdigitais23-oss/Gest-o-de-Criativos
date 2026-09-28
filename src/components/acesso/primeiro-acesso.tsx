"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, KeyRound, LayoutGrid, Sparkles, ThumbsUp, X } from "lucide-react";
import { salvarPrimeiraSenha } from "@/app/primeiro-acesso/actions";
import { RegrasSenha } from "@/components/auth/regras-senha";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Campo, PasswordInput } from "@/components/ui/input";
import { senhaValida } from "@/lib/senha";
import { cn } from "@/lib/utils";

export interface PerfilBoasVindas {
  id: string;
  nome: string;
  tipo: string;
  avatarSrc: string | null;
}

const PASSOS = [
  { icone: KeyRound, texto: "Crie sua senha" },
  { icone: LayoutGrid, texto: "Conheça seus perfis" },
  { icone: ThumbsUp, texto: "Aprove em um toque" },
];

/** Lado esquerdo do primeiro acesso: boas-vindas com os perfis dela. */
export function HeroBoasVindas({ nome, perfis }: { nome: string; perfis: PerfilBoasVindas[] }) {
  return (
    <div className="max-w-lg">
      <span className="rotulo inline-flex items-center gap-1.5 rounded-full border border-cyan-400/60 bg-white/10 px-3 py-1.5 text-white backdrop-blur-sm">
        <Sparkles className="size-3.5 text-cyan-400" aria-hidden /> Seu acesso ao CRM
      </span>
      <h1 className="mt-5 text-3xl font-bold leading-tight text-white sm:text-5xl sm:leading-[1.1]">
        Bem-vinda, <span className="bg-gradient-to-r from-white to-cyan-400 bg-clip-text text-transparent">{nome.split(" ")[0]}</span>
      </h1>
      <p className="mt-4 text-body text-white/85 sm:text-lg">
        Aqui chegam os posts do LinkedIn para você aprovar, pedir ajustes ou reprovar — tudo registrado, sem planilhas nem WhatsApp perdido.
      </p>
      {perfis.length > 0 && (
        <div className="mt-8">
          <p className="rotulo text-white/70">Perfis que você aprova</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {perfis.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-[var(--radius-control)] border border-white/20 bg-white/10 p-3 backdrop-blur-md"
              >
                <Avatar nome={p.nome} src={p.avatarSrc} size="md" className="ring-2 ring-white/40" />
                <span className="min-w-0">
                  <span className="block truncate text-body font-bold text-white">{p.nome}</span>
                  <span className="block text-label text-white/70">{p.tipo === "empresa" ? "Institucional" : "Pessoal"}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ol className="mt-8 hidden gap-2 sm:flex">
        {PASSOS.map(({ icone: Icone, texto }, i) => (
          <li key={texto} className="flex items-center gap-2 text-label text-white/85">
            <span className={cn("flex size-7 items-center justify-center rounded-full", i === 0 ? "bg-cyan-400 text-navy-900" : "bg-white/15 text-white")}>
              <Icone className="size-3.5" aria-hidden />
            </span>
            {texto}
            {i < PASSOS.length - 1 && <ArrowRight className="size-3.5 text-white/40" aria-hidden />}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Cartão de vidro: criar a senha definitiva. Em `previa`, nada é enviado. */
export function FormPrimeiroAcesso({ nome, previa = false }: { nome: string; previa?: boolean }) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const confere = confirmacao.length > 0 && senha === confirmacao;
  const pronto = senhaValida(senha) && confere;

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (previa) return;
    setErro(null);
    iniciar(async () => {
      const r = await salvarPrimeiraSenha(senha, confirmacao);
      if (!r.ok) return setErro(r.erro);
      setSenha("");
      setConfirmacao("");
      router.replace("/?boas-vindas=1");
      router.refresh();
    });
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-5" data-testid="form-primeiro-acesso">
      <div>
        <p className="rotulo text-blue-600">Primeiro acesso</p>
        <h2 className="mt-1 text-2xl font-bold text-navy-900">Olá, {nome.split(" ")[0]}! Crie sua senha</h2>
        <p className="mt-1 text-body text-text-muted">Ela substitui o convite ou a senha provisória. Só você vai conhecê-la.</p>
      </div>
      <Campo label="Nova senha" htmlFor="nova-senha">
        <PasswordInput id="nova-senha" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" required />
      </Campo>
      <RegrasSenha senha={senha} className="-mt-2" />
      <Campo label="Confirmar senha" htmlFor="confirmar-senha">
        <PasswordInput
          id="confirmar-senha"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          autoComplete="new-password"
          required
        />
      </Campo>
      {confirmacao.length > 0 && (
        <p className={cn("-mt-3 flex items-center gap-1.5 text-label", confere ? "text-st-aprovado-text" : "text-danger")}>
          {confere ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
          {confere ? "As senhas conferem" : "As senhas ainda não conferem"}
        </p>
      )}
      {erro && (
        <p role="alert" className="rounded-[var(--radius-control)] bg-st-reprovado-bg px-3 py-2 text-body text-st-reprovado-text">
          {erro}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={!pronto || previa} carregando={pendente} title={previa ? "Pré-visualização: nada é enviado" : undefined}>
        Salvar e entrar <ArrowRight />
      </Button>
    </form>
  );
}
