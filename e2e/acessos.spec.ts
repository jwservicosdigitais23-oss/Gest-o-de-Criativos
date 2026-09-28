import { expect, test, type Page } from "@playwright/test";

/**
 * Prompt 9 · Acessos das aprovadoras e "Ver como".
 *
 * Sem sessão (sempre rodam): rotas novas protegidas.
 * Com login real (rodam quando as variáveis existem, ex.: contra o preview da Vercel):
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_SENHA
 *   E2E_EDNA_EMAIL / E2E_EDNA_SENHA       (aprovadora de Edna Queiroz + Grupo Adere)
 *   E2E_DANIELA_EMAIL / E2E_DANIELA_SENHA (aprovadora de Daniela Quintana + Grupo Adere)
 *   E2E_PROVISORIA_EMAIL / E2E_PROVISORIA_SENHA (conta recém-criada com senha provisória)
 */
const env = (n: string) => process.env[n] ?? "";
const temAdmin = Boolean(env("E2E_ADMIN_EMAIL"));
const temAprovadoras = Boolean(env("E2E_EDNA_EMAIL") && env("E2E_DANIELA_EMAIL"));

async function entrar(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test.describe("sem sessão", () => {
  for (const rota of ["/primeiro-acesso", "/minha-conta", "/previa/login", "/previa/convite", "/previa/primeiro-acesso"]) {
    test(`${rota} exige login`, async ({ page }) => {
      await page.goto(rota);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test("link do e-mail padrão (sessão no #fragmento) passa por /auth/callback", async ({ page }) => {
  const vistos: string[] = [];
  page.on("framenavigated", (f) => f === page.mainFrame() && vistos.push(f.url()));
  await page.goto("/auth/confirm?next=/primeiro-acesso#access_token=invalido&refresh_token=invalido&type=invite");
  await expect(page).toHaveURL(/\/login\?erro=link/);
  expect(vistos.some((u) => u.includes("/auth/callback"))).toBe(true);
});

test.describe("aprovadoras", () => {
  test.skip(!temAprovadoras, "defina E2E_EDNA_* e E2E_DANIELA_*");

  test("Edna só vê Edna Queiroz + Grupo Adere", async ({ page }) => {
    await entrar(page, env("E2E_EDNA_EMAIL"), env("E2E_EDNA_SENHA"));
    const menu = page.getByRole("navigation", { name: "Menu principal" });
    await expect(menu.getByText("Edna Queiroz")).toBeVisible();
    await expect(menu.getByText("Grupo Adere")).toBeVisible();
    await expect(menu.getByText("Daniela Quintana")).toHaveCount(0);
  });

  test("Daniela só vê Daniela Quintana + Grupo Adere", async ({ page }) => {
    await entrar(page, env("E2E_DANIELA_EMAIL"), env("E2E_DANIELA_SENHA"));
    const menu = page.getByRole("navigation", { name: "Menu principal" });
    await expect(menu.getByText("Daniela Quintana")).toBeVisible();
    await expect(menu.getByText("Grupo Adere")).toBeVisible();
    await expect(menu.getByText("Edna Queiroz")).toHaveCount(0);
  });

  test('"Ver como" não aparece para aprovadora', async ({ page }) => {
    await entrar(page, env("E2E_EDNA_EMAIL"), env("E2E_EDNA_SENHA"));
    await page.getByRole("button", { name: "Menu do usuário" }).click();
    await expect(page.getByText(/Ver como/)).toHaveCount(0);
    await page.goto("/configuracoes?aba=membros");
    await expect(page).not.toHaveURL(/configuracoes/);
  });
});

test.describe("senha provisória", () => {
  test.skip(!env("E2E_PROVISORIA_EMAIL"), "defina E2E_PROVISORIA_*");

  test("obriga a troca no primeiro acesso", async ({ page }) => {
    await entrar(page, env("E2E_PROVISORIA_EMAIL"), env("E2E_PROVISORIA_SENHA"));
    await expect(page).toHaveURL(/\/primeiro-acesso/);
    await page.goto("/calendario");
    await expect(page).toHaveURL(/\/primeiro-acesso/);
  });
});

test.describe("Ver como (admin)", () => {
  test.skip(!temAdmin || !temAprovadoras, "defina E2E_ADMIN_* e as aprovadoras");

  test("somente leitura: faixa, botões desabilitados e perfis dela", async ({ page }) => {
    await entrar(page, env("E2E_ADMIN_EMAIL"), env("E2E_ADMIN_SENHA"));
    await page.getByRole("button", { name: "Menu do usuário" }).click();
    await page.getByRole("menuitem", { name: /Ver como Edna/ }).click();
    await expect(page.getByTestId("faixa-ver-como")).toContainText("Você está vendo o CRM como Edna");
    const menu = page.getByRole("navigation", { name: "Menu principal" });
    await expect(menu.getByText("Daniela Quintana")).toHaveCount(0);
    await expect(menu.getByText("Configurações")).toHaveCount(0);
    // Páginas de admin ficam fora do alcance
    await page.goto("/posts/novo");
    await expect(page).not.toHaveURL(/posts\/novo/);
    const revisar = page.getByRole("link", { name: /Revisar agora/ }).first();
    if (await revisar.count()) {
      await revisar.click();
      await expect(page.getByRole("button", { name: "Aprovar" })).toBeDisabled();
      await expect(page.getByTestId("dica-somente-leitura")).toHaveText(/Apenas a Edna pode decidir/);
    }
    await page.getByRole("button", { name: "Sair da visualização" }).click();
    await expect(page).toHaveURL(/configuracoes/);
  });
});
