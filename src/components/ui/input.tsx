"use client";

import * as React from "react";
import { Eye, EyeOff, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const campoBase =
  "transicao w-full rounded-[var(--radius-control)] border border-border bg-surface-solid px-3 text-body text-text placeholder:text-text-muted hover:border-blue-600/40 focus-visible:border-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-cyan-400/40 disabled:cursor-not-allowed disabled:bg-bg-app-from disabled:opacity-70 aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(campoBase, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(campoBase, "min-h-24 py-2 leading-relaxed", className)} {...props} />;
}

/**
 * Select nativo (ótimo no celular). Nunca corta o texto: a largura mínima é
 * a do maior rótulo (min-width: max-content).
 */
export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(campoBase, "h-10 min-w-max cursor-pointer pr-9", className)} {...props} />;
}

/** Busca em formato de pílula, com lupa. */
export function SearchField({
  className,
  rotulo = "Buscar",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { rotulo?: string }) {
  const id = React.useId();
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={props.id ?? id} className="sr-only">{rotulo}</label>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
      <input
        id={props.id ?? id}
        type="search"
        className={cn(campoBase, "h-10 rounded-full pl-10 pr-4")}
        {...props}
      />
    </div>
  );
}

/** Senha com botão de mostrar/ocultar. */
export function PasswordInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visivel, setVisivel] = React.useState(false);
  return (
    <div className={cn("relative", className)}>
      <input {...props} type={visivel ? "text" : "password"} className={cn(campoBase, "h-10 pr-11")} />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        disabled={props.disabled}
        className="transicao absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[var(--radius-control)] text-text-muted hover:text-navy-900"
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
      >
        {visivel ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-label font-semibold text-navy-900", className)} {...props} />;
}

export function Campo({
  label,
  htmlFor,
  erro,
  ajuda,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  erro?: string;
  ajuda?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {erro ? (
        <p className="text-label text-danger" role="alert">
          {erro}
        </p>
      ) : ajuda ? (
        <p className="text-label text-text-muted">{ajuda}</p>
      ) : null}
    </div>
  );
}
