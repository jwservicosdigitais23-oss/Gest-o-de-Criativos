import type { Metadata } from "next";
import { LoginForm } from "@/app/(auth)/login/login-form";
import { LayoutAuth } from "@/components/auth/layout-auth";
import { exigirMembro } from "@/lib/auth";

export const metadata: Metadata = { title: "Prévia · tela de login" };

export default async function PreviaLoginPage() {
  const { membro } = await exigirMembro();
  return (
    <LayoutAuth>
      <LoginForm next="/" mostrarPrimeiroAcesso={false} previa={{ email: membro.email }} />
    </LayoutAuth>
  );
}
