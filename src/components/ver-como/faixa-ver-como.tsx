import Link from "next/link";
import { ChevronDown, Eye, KeyRound, LogIn, LogOut, Mail } from "lucide-react";
import { sairVerComo } from "@/app/ver-como/actions";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const ALTURA_FAIXA = 48;

const PREVIAS = [
  { href: "/previa/login", rotulo: "Ver tela de login", icone: LogIn },
  { href: "/previa/convite", rotulo: "Ver e-mail de convite", icone: Mail },
  { href: "/previa/primeiro-acesso", rotulo: "Ver primeiro acesso", icone: KeyRound },
];

/** Faixa âmbar fixa no topo durante o "Ver como" (somente leitura). */
export function FaixaVerComo({ nome, avatarUrl }: { nome: string; avatarUrl?: string | null }) {
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-40 flex items-center gap-3 border-b border-warning/50 bg-[#FFB020] px-3 text-navy-900 shadow-card sm:px-5"
      style={{ height: ALTURA_FAIXA }}
      data-testid="faixa-ver-como"
    >
      <Eye className="hidden size-5 shrink-0 sm:block" aria-hidden />
      <Avatar nome={nome} src={avatarUrl} size="sm" className="ring-2 ring-white/70" />
      <p className="min-w-0 flex-1 truncate text-body">
        <span className="sm:hidden">
          Vendo como <strong>{nome.split(" ")[0]}</strong> · somente leitura
        </span>
        <span className="hidden sm:inline">
          Você está vendo o CRM como <strong>{nome}</strong> — modo somente leitura
        </span>
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger className="transicao hidden h-8 items-center gap-1 rounded-[var(--radius-control)] px-2.5 text-label font-semibold hover:bg-black/10 md:inline-flex">
          Pré-visualizações <ChevronDown className="size-3.5" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {PREVIAS.map(({ href, rotulo, icone: Icone }) => (
            <DropdownMenuItem key={href} asChild>
              <Link href={href}>
                <Icone /> {rotulo}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <form action={sairVerComo.bind(null, "/configuracoes?aba=membros")}>
        <button
          type="submit"
          className="transicao inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-control)] bg-navy-900 px-3 text-label font-bold text-white hover:bg-navy-700"
        >
          <LogOut className="size-3.5" aria-hidden /> Sair da visualização
        </button>
      </form>
    </div>
  );
}
