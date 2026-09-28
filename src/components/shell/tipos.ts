export interface PerfilMenu {
  id: string;
  nome: string;
  avatarUrl: string | null;
  aguardando: number;
}

export interface UsuarioShell {
  id: string;
  nome: string;
  papel: "admin" | "aprovadora";
  avatarUrl: string | null;
}
