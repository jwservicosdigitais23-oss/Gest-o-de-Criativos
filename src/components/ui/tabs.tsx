"use client";

import * as React from "react";
import { Tabs as T } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof T.List>) {
  return (
    <T.List
      className={cn("inline-flex gap-1 rounded-[10px] border border-borda bg-white p-1", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-semibold text-texto-2 transition-colors hover:text-azul-escuro data-[state=active]:bg-azul-medio data-[state=active]:text-white [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export const TabsContent = T.Content;
