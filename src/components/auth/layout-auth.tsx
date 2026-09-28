import Image from "next/image";
import { CalendarClock, FolderKanban, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const BENEFICIOS = [
  { icone: FolderKanban, titulo: "Tudo num só lugar", texto: "Post, mídia, data e decisão reunidos por perfil." },
  { icone: ShieldCheck, titulo: "Decisão registrada", texto: "Cada aprovação fica gravada com data, versão e observação." },
  { icone: CalendarClock, titulo: "Cronograma automático", texto: "Suba o Excel e os posts entram nas datas certas." },
];

/**
 * Tela de entrada: foto da cidade em tela cheia com sobreposição azul da
 * marca; textos à esquerda e o formulário num cartão de vidro à direita.
 */
export function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-navy-900">
      <Image
        src="/imagens/login-cidade.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />
      {/* Sobreposição: azul-escuro à esquerda (legibilidade), mais leve à direita */}
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(0_31_77/0.92)_0%,rgb(0_31_77/0.72)_45%,rgb(0_76_151/0.35)_100%)]"
        aria-hidden
      />

      <div className="mx-auto grid min-h-dvh max-w-7xl gap-8 px-5 py-8 sm:px-10 lg:grid-cols-[1fr_minmax(0,440px)] lg:items-center lg:gap-16 lg:py-12">
        <section className="flex flex-col gap-8 text-white lg:gap-14">
          <Logo variante="branco" tamanho="lg" />
          <div className="max-w-lg">
            <span className="rotulo inline-block rounded-full border border-cyan-400/60 bg-white/10 px-3 py-1.5 text-white backdrop-blur-sm">
              Aprovação de criativos
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-tight text-white sm:text-5xl sm:leading-[1.1]">
              Do criativo ao post aprovado
            </h1>
            <ul className="mt-10 hidden flex-col gap-6 sm:flex">
              {BENEFICIOS.map(({ icone: Icone, titulo, texto }) => (
                <li key={titulo} className="flex gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-white/20 bg-white/10 backdrop-blur-sm">
                    <Icone className="size-6 text-white" aria-hidden />
                  </span>
                  <div>
                    <p className="text-card-title text-white">{titulo}</p>
                    <p className="text-body text-white/80">{texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="surface-glass flex flex-col rounded-[var(--radius-card)] p-6 shadow-elevated sm:p-10">
          <div className="flex flex-1 flex-col justify-center">{children}</div>
          <p className="mt-10 text-center text-label text-text-muted">Grupo Adere · Gestão de Negócios</p>
        </section>
      </div>
    </div>
  );
}
