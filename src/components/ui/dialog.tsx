"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  className,
  children,
  titulo,
  descricao,
  telaCheiaNoCelular = false,
  ...props
}: React.ComponentProps<typeof D.Content> & {
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  telaCheiaNoCelular?: boolean;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-azul-escuro/40 backdrop-blur-[1px]" />
      <D.Content
        className={cn(
          "fixed z-50 flex flex-col bg-white shadow-xl focus:outline-none",
          telaCheiaNoCelular
            ? "inset-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90dvh] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[10px]"
            : "left-1/2 top-1/2 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[10px]",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-borda px-5 py-4">
          <div>
            <D.Title className="text-lg font-bold text-azul-escuro">{titulo}</D.Title>
            {descricao ? (
              <D.Description className="mt-1 text-sm text-texto-2">{descricao}</D.Description>
            ) : (
              <D.Description className="sr-only">{typeof titulo === "string" ? titulo : ""}</D.Description>
            )}
          </div>
          <D.Close className="rounded-md p-1 text-texto-2 hover:bg-fundo hover:text-azul-escuro" aria-label="Fechar">
            <X className="size-5" />
          </D.Close>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </D.Content>
    </D.Portal>
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}
