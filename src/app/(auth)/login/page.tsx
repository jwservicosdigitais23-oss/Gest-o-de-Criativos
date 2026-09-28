import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next, erro } = await props.searchParams;
  const supabase = await createClient();
  const { data: temAdmin } = await supabase.rpc("sistema_tem_admin");
  return (
    <>
      {erro === "link" && (
        <p role="alert" className="mb-5 rounded-[10px] bg-st-revisao-bg px-3 py-2 text-sm text-st-revisao">
          O link expirou ou já foi usado. Peça um novo convite ou redefina a senha.
        </p>
      )}
      <LoginForm next={typeof next === "string" ? next : "/"} mostrarPrimeiroAcesso={temAdmin === false} />
    </>
  );
}
