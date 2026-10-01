import { expect, test, type Page } from "@playwright/test";

/**
 * Fila do Grupo Adere na tela. Roda contra um ambiente de teste/preview com
 * usuários de teste (nunca contra produção):
 *   E2E_EDNA_EMAIL / E2E_EDNA_SENHA, E2E_DANIELA_EMAIL / E2E_DANIELA_SENHA
 *   E2E_GRUPO_TEMA — tema de um post do Grupo Adere aguardando nas duas filas
 */
const env = (n: string) => process.env[n] ?? "";
const pronto = Boolean(env("E2E_EDNA_EMAIL") && env("E2E_DANIELA_EMAIL") && env("E2E_GRUPO_TEMA"));

async function entrar(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test.describe("fila do Grupo Adere", () => {
  test.skip(!pronto, "defina E2E_EDNA_*, E2E_DANIELA_* e E2E_GRUPO_TEMA");

  for (const quem of ["EDNA", "DANIELA"] as const) {
    test(`${quem}: post do Grupo Adere está na fila e os contadores batem`, async ({ page }) => {
      await entrar(page, env(`E2E_${quem}_EMAIL`), env(`E2E_${quem}_SENHA`));
      await expect(page.getByText(env("E2E_GRUPO_TEMA")).first()).toBeVisible();
      // KPI "Para você aprovar" = soma dos contadores da sidebar
      const kpi = Number(await page.getByText("Para você aprovar").locator("..").locator("p").first().innerText());
      const menu = page.getByRole("navigation", { name: "Menu principal" });
      const contadores = await menu.locator("a[href^='/perfis/'] span:last-child").allInnerTexts();
      const soma = contadores.map(Number).filter((n) => !Number.isNaN(n)).reduce((s, n) => s + n, 0);
      expect(soma).toBe(kpi);
      await expect(menu.getByText("Grupo Adere")).toBeVisible();
    });
  }
});
