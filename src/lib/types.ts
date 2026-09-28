export type Papel = "admin" | "aprovadora";
export type StatusPost =
  | "rascunho"
  | "aguardando"
  | "em_revisao"
  | "aprovado"
  | "reprovado"
  | "publicado"
  | "arquivado";
export type TipoDecisao = "aprovado" | "reprovado" | "revisar";
export type Formato = "imagem" | "carrossel" | "video" | "texto" | "documento";
export type ModoAprovacao = "todas" | "qualquer_uma";
export type TipoPerfil = "pessoal" | "empresa";

export interface Membro {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  avatar_url: string | null;
  ativo: boolean;
  ultimo_acesso: string | null;
  deve_trocar_senha: boolean;
  created_at: string;
  updated_at: string;
}

export interface Perfil {
  id: string;
  nome: string;
  tipo: TipoPerfil;
  linkedin_url: string | null;
  avatar_url: string | null;
  modo_aprovacao: ModoAprovacao;
  ordem: number;
  arquivado: boolean;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  perfil_id: string;
  status: StatusPost;
  data_publicacao: string;
  hora_publicacao: string | null;
  tema: string;
  legenda: string;
  formato: Formato;
  pilar: string | null;
  cta: string | null;
  prazo_aprovacao: string | null;
  versao: number;
  link_publicado: string | null;
  publicado_em: string | null;
  origem: "manual" | "importacao";
  chave_externa: string | null;
  arquivo_ref: string | null;
  enviado_em: string | null;
  decidido_em: string | null;
  duplicado_de: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostVersao {
  post_id: string;
  versao: number;
  tema: string;
  legenda: string;
  formato: Formato;
  pilar: string | null;
  cta: string | null;
  data_publicacao: string;
  hora_publicacao: string | null;
  enviado_por: string | null;
  created_at: string;
}

export type TipoMidia = "imagem" | "pdf" | "video" | "link";

export interface Midia {
  id: string;
  post_id: string;
  versao: number;
  versao_removida: number | null;
  ordem: number;
  tipo: TipoMidia;
  storage_path: string | null;
  url_externa: string | null;
  nome_arquivo: string;
  mime: string | null;
  tamanho: number | null;
  largura: number | null;
  altura: number | null;
  created_at: string;
}

export interface Decisao {
  id: string;
  post_id: string;
  versao: number;
  autor_id: string;
  decisao: TipoDecisao;
  observacao: string | null;
  itens: string[];
  created_at: string;
}

export interface Comentario {
  id: string;
  post_id: string;
  versao: number;
  decisao_id: string | null;
  autor_id: string;
  texto: string;
  created_at: string;
}

export interface Historico {
  id: number;
  entidade: string;
  entidade_id: string | null;
  post_id: string | null;
  perfil_id: string | null;
  acao: string;
  versao: number | null;
  autor_id: string | null;
  detalhes: Record<string, unknown>;
  created_at: string;
}

export interface Notificacao {
  id: string;
  destinatario_id: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
  post_id: string | null;
  lida: boolean;
  created_at: string;
}

export interface Importacao {
  id: string;
  arquivo_nome: string;
  total: number;
  criados: number;
  atualizados: number;
  ignorados: number;
  erros: number;
  detalhes: unknown;
  autor_id: string | null;
  created_at: string;
}
