import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { emailConvite, emailRecuperacao, MARCADORES } from "./emails";

describe("e-mails do Supabase Auth", () => {
  it("os templates em supabase/templates estão em dia com src/lib/emails.ts (rode npm run emails)", () => {
    expect(readFileSync("supabase/templates/convite.html", "utf8")).toBe(emailConvite(MARCADORES.convite));
    expect(readFileSync("supabase/templates/recuperacao.html", "utf8")).toBe(emailRecuperacao(MARCADORES.recuperacao));
  });

  it("convite em português, com logo, botão Criar minha senha e o nome dos perfis", () => {
    const html = emailConvite({ siteUrl: "https://crm.dev", link: "https://crm.dev/x", nome: "Edna", perfis: "Edna Queiroz e Grupo Adere" });
    expect(html).toContain("https://crm.dev/logo-adere-branco.png");
    expect(html).toContain("Criar minha senha");
    expect(html).toContain("Edna Queiroz e Grupo Adere");
    expect(MARCADORES.convite.link).toContain("next=/primeiro-acesso");
  });
});
