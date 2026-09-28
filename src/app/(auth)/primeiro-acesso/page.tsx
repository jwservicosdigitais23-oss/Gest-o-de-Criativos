import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrimeiroAcessoForm } from "./form";

export const metadata: Metadata = { title: "Primeiro acesso" };

export default async function PrimeiroAcessoPage() {
  const supabase = await createClient();
  const { data: temAdmin } = await supabase.rpc("sistema_tem_admin");
  if (temAdmin !== false) redirect("/login");
  return <PrimeiroAcessoForm />;
}
