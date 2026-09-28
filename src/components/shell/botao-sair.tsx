"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function BotaoSair({ variante = "link" }: { variante?: "link" | "botao" }) {
  const router = useRouter();
  async function sair() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <Button variant={variante === "botao" ? "secondary" : "ghost"} size="sm" onClick={sair}>
      <LogOut /> Sair
    </Button>
  );
}
