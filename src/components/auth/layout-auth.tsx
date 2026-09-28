import { CalendarClock, FolderKanban, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const BENEFICIOS = [
  { icone: FolderKanban, titulo: "Tudo num só lugar", texto: "Post, mídia, data e decisão reunidos por perfil." },
  { icone: ShieldCheck, titulo: "Decisão registrada", texto: "Cada aprovação fica gravada com data, versão e observação." },
  { icone: CalendarClock, titulo: "Cronograma automático", texto: "Suba o Excel e os posts entram nas datas certas." },
];

export function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="bg-gradiente-marca relative flex flex-col gap-10 lg:justify-center lg:gap-24 px-6 py-8 text-white sm:px-12 sm:py-12">
        <Logo variante="branco" />
        <div className="max-w-md">
          <span className="rotulo inline-block rounded-full border border-white/30 bg-white/10 px-3 py-1 text-white">
            Aprovação de criativos
          </span>
          <h1 className="mt-5 text-3xl font-bold leading-tight text-white sm:text-4xl">
            Do criativo ao post aprovado
          </h1>
          <ul className="mt-8 hidden flex-col gap-5 sm:flex">
            {BENEFICIOS.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-white/15">
                  <Icone className="size-5 text-white" aria-hidden />
                </span>
                <div>
                  <p className="font-bold text-white">{titulo}</p>
                  <p className="text-sm text-white/80">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="flex flex-col bg-white px-6 py-10 sm:px-12">
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">{children}</div>
        <p className="mt-10 text-center text-xs text-texto-2">Grupo Adere · Gestão de Negócios</p>
      </section>
    </div>
  );
}
