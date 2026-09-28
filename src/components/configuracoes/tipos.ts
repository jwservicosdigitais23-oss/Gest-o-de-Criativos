import type { ModoAprovacao, Papel, TipoPerfil } from "@/lib/types";

export interface PerfilConfig {
  id: string;
  nome: string;
  tipo: TipoPerfil;
  linkedin_url: string | null;
  avatar_url: string | null;
  avatarSrc: string | null;
  modo_aprovacao: ModoAprovacao;
  ordem: number;
  arquivado: boolean;
  aprovadoras: string[];
  totalPosts: number;
}

export interface MembroConfig {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
  ultimo_acesso: string | null;
  avatarSrc: string | null;
  perfis: string[];
}
