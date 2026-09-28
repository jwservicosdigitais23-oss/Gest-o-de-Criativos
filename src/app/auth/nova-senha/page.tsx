import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LayoutAuth } from "@/components/auth/layout-auth";
import { obterSessao } from "@/lib/auth";
import { NovaSenhaForm } from "./nova-senha-form";

export const metadata: Metadata = { title: "Definir senha" };

export default async function NovaSenhaPage() {
  const { userId, membro, email } = await obterSessao();
  if (!userId) redirect("/login?erro=link");
  return (
    <LayoutAuth>
      <NovaSenhaForm nome={membro?.nome ?? email ?? ""} />
    </LayoutAuth>
  );
}
