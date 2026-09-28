import * as React from "react";
import { cn } from "@/lib/utils";

export const campoBase =
  "w-full rounded-[10px] border border-borda bg-white px-3 text-sm text-texto placeholder:text-texto-2 transition-colors focus-visible:border-azul-claro focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-azul-claro/40 disabled:cursor-not-allowed disabled:bg-fundo aria-[invalid=true]:border-vermelho";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(campoBase, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(campoBase, "min-h-24 py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(campoBase, "h-10 pr-8", className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-semibold text-azul-escuro", className)} {...props} />;
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
        <p className="text-xs font-medium text-vermelho" role="alert">
          {erro}
        </p>
      ) : ajuda ? (
        <p className="text-xs text-texto-2">{ajuda}</p>
      ) : null}
    </div>
  );
}
