"use client";

import { Toaster as Sonner, toast } from "sonner";

/** Toasts no padrão do Design System (vidro, raio 12px, fonte da marca). */
export function Toaster() {
  return (
    <Sonner
      position="top-right"
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast: "!rounded-[var(--radius-control)] !font-sans !shadow-elevated !text-body",
          title: "!font-semibold",
          description: "!text-label",
        },
      }}
    />
  );
}

export { toast };
