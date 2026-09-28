import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logo oficial do Grupo Adere (public/logo-adere.png, proporção 452×160).
 * Versão colorida sobre fundo claro e branca (monocromática) sobre fundos
 * escuros, conforme o manual. Largura mínima de 150px, sem distorcer.
 */
const LARGURAS = { sm: 150, md: 170, lg: 220 } as const;

export function Logo({
  variante = "cor",
  tamanho = "md",
  className,
}: {
  variante?: "cor" | "branco";
  tamanho?: keyof typeof LARGURAS;
  className?: string;
}) {
  const largura = LARGURAS[tamanho];
  return (
    <Image
      src={variante === "branco" ? "/logo-adere-branco.png" : "/logo-adere.png"}
      alt="Adere · Gestão de Negócios"
      width={largura}
      height={Math.round((largura * 160) / 452)}
      priority
      className={cn("h-auto max-w-none", className)}
      style={{ width: largura }}
    />
  );
}
