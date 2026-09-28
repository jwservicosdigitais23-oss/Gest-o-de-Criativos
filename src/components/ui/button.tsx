import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul-claro",
  {
    variants: {
      variant: {
        primary: "bg-azul-medio text-white hover:bg-azul-escuro",
        secondary: "border border-borda bg-white text-azul-escuro hover:bg-fundo",
        ghost: "text-texto hover:bg-fundo",
        link: "text-azul-medio underline-offset-4 hover:underline px-0",
        aprovar: "bg-verde text-white hover:bg-[#166534]",
        revisar: "bg-ambar text-white hover:bg-[#92400e]",
        reprovar: "bg-vermelho text-white hover:bg-[#b91c1c]",
        danger: "border border-[#fecaca] bg-white text-vermelho hover:bg-[#fef2f2]",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-5",
        decisao: "min-h-11 px-5 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
