import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "transicao inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] font-semibold disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400",
  {
    variants: {
      variant: {
        primary: "bg-gradiente-primario text-white shadow-[0_4px_12px_rgb(0_76_151/0.25)] hover:brightness-110 active:brightness-95",
        secondary: "border border-border bg-surface-solid text-navy-900 hover:border-blue-600 hover:text-blue-600",
        ghost: "text-text hover:bg-bg-app-from hover:text-navy-900",
        danger: "border border-danger-border bg-surface-solid text-danger hover:bg-danger-soft",
        link: "px-0 text-blue-600 underline-offset-4 hover:underline",
        aprovar: "bg-success text-white hover:bg-success-hover",
        revisar: "bg-warning text-white hover:bg-warning-hover",
        reprovar: "bg-danger text-white hover:bg-danger-hover",
      },
      size: {
        sm: "h-8 px-3 text-label",
        md: "h-10 px-4 text-body",
        lg: "h-12 px-6 text-body",
        icon: "size-10",
        decisao: "min-h-11 px-5 text-base",
        /** @deprecated use "md" */
        default: "h-10 px-4 text-body",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Mostra o spinner e bloqueia o clique. */
  carregando?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  carregando = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, className }));
  if (asChild) {
    return <Slot.Root className={classes} {...props}>{children}</Slot.Root>;
  }
  return (
    <button className={classes} disabled={disabled || carregando} aria-busy={carregando || undefined} {...props}>
      {carregando && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
