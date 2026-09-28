/**
 * Regras de acesso das aprovadoras (Prompt 9), separadas das server actions
 * para poderem ser testadas com dependências falsas.
 *
 * A senha provisória só é passada ao Supabase Auth (auth.admin.createUser /
 * updateUserById). Ela nunca vai para tabela, histórico nem log: os eventos
 * registram apenas QUE uma senha provisória foi definida.
 */
import { z } from "zod";
import { ERRO_SENHA, senhaValida } from "./senha";

export type FormaAcesso = "convite" | "senha";

export const novaAprovadoraSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome.").max(80),
    email: z.string().trim().toLowerCase().email("E-mail inválido."),
    perfis: z.array(z.string().uuid()).min(1, "Marque pelo menos um perfil."),
    forma: z.enum(["convite", "senha"]),
    senha: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.forma === "senha" && !senhaValida(d.senha ?? "")) {
      ctx.addIssue({ code: "custom", path: ["senha"], message: ERRO_SENHA });
    }
  });

export type DadosNovaAprovadora = z.input<typeof novaAprovadoraSchema>;

type ErroAuth = { message: string } | null;

/** O que as regras precisam do mundo externo (Supabase Auth e banco). */
export interface DepsAcesso {
  convidar(email: string, opcoes: { data: Record<string, string>; redirectTo: string }): Promise<{ id: string | null; erro: ErroAuth }>;
  criarUsuario(email: string, senha: string, dados: Record<string, string>): Promise<{ id: string | null; erro: ErroAuth }>;
  definirSenha(id: string, senha: string): Promise<{ erro: ErroAuth }>;
  inserirMembro(m: { id: string; nome: string; email: string; papel: "aprovadora"; deve_trocar_senha: boolean }): Promise<{ erro: ErroAuth }>;
  marcarTrocaSenha(id: string): Promise<{ erro: ErroAuth }>;
  vincularPerfis(id: string, perfis: string[]): Promise<void>;
  historico(evento: { entidade: "membro"; entidade_id: string; acao: string; detalhes?: Record<string, unknown> }): Promise<void>;
}

export type ResultadoAcesso = { ok: true; id: string } | { ok: false; erro: string };

function mensagemAuth(erro: ErroAuth, padrao: string) {
  const msg = erro?.message ?? "";
  if (/already (been )?registered|already exists/i.test(msg)) {
    return "Esse e-mail já tem conta no Supabase Auth. Remova-o em Authentication › Users ou use outro e-mail.";
  }
  if (/rate limit/i.test(msg)) {
    return "O Supabase atingiu o limite de e-mails por hora (o envio padrão, sem SMTP próprio, é bem restrito). Use “Definir senha provisória” ou tente de novo mais tarde.";
  }
  return `${padrao}${msg ? `: ${msg}` : ""}`;
}

/** Texto com os perfis, para o e-mail: "Edna Queiroz e Grupo Adere". */
export function listarNomes(nomes: string[]) {
  if (nomes.length <= 1) return nomes[0] ?? "";
  return `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
}

export async function criarAprovadora(
  deps: DepsAcesso,
  entrada: DadosNovaAprovadora,
  contexto: { redirectTo: string; nomesPerfis: string[] },
): Promise<ResultadoAcesso> {
  const parsed = novaAprovadoraSchema.safeParse(entrada);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]!.message };
  const { nome, email, perfis, forma, senha } = parsed.data;
  const dadosEmail = { nome, perfis: listarNomes(contexto.nomesPerfis) };

  const criado =
    forma === "convite"
      ? await deps.convidar(email, { data: dadosEmail, redirectTo: contexto.redirectTo })
      : await deps.criarUsuario(email, senha!, dadosEmail);
  if (criado.erro || !criado.id) {
    return { ok: false, erro: mensagemAuth(criado.erro, forma === "convite" ? "Não foi possível enviar o convite" : "Não foi possível criar o acesso") };
  }

  const { erro } = await deps.inserirMembro({ id: criado.id, nome, email, papel: "aprovadora", deve_trocar_senha: true });
  if (erro) return { ok: false, erro: "Acesso criado, mas falhou ao registrar a aprovadora." };
  await deps.vincularPerfis(criado.id, perfis);
  await deps.historico({
    entidade: "membro",
    entidade_id: criado.id,
    acao: forma === "convite" ? "convidou_membro" : "definiu_senha_provisoria",
    detalhes: { nome, email, perfis, forma },
  });
  return { ok: true, id: criado.id };
}

export async function redefinirSenhaProvisoria(deps: DepsAcesso, id: string, senha: string): Promise<ResultadoAcesso> {
  if (!senhaValida(senha)) return { ok: false, erro: ERRO_SENHA };
  const { erro } = await deps.definirSenha(id, senha);
  if (erro) return { ok: false, erro: mensagemAuth(erro, "Não foi possível definir a senha") };
  const marcado = await deps.marcarTrocaSenha(id);
  if (marcado.erro) return { ok: false, erro: "Senha definida, mas falhou ao exigir a troca no primeiro acesso." };
  await deps.historico({ entidade: "membro", entidade_id: id, acao: "gerou_senha_provisoria" });
  return { ok: true, id };
}

export type StatusMembro = "pendente" | "ativa" | "desativada";

export function statusMembro(m: { ativo: boolean; deve_trocar_senha: boolean }): StatusMembro {
  if (!m.ativo) return "desativada";
  return m.deve_trocar_senha ? "pendente" : "ativa";
}

export const ROTULO_STATUS: Record<StatusMembro, string> = {
  pendente: "Convite pendente",
  ativa: "Ativa",
  desativada: "Desativada",
};
