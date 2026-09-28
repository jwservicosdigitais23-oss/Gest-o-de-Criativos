import { defineConfig, devices } from "@playwright/test";

/**
 * E2E do Prompt 9. Sem E2E_BASE_URL, sobe o `next start` local (rode `npm run build` antes).
 * Os fluxos com login real precisam das variáveis E2E_* (ver e2e/acessos.spec.ts).
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 45_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    ...devices["Desktop Chrome"],
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {},
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npx next start -p 3100", url: "http://localhost:3100/login", reuseExistingServer: true, timeout: 60_000 },
});
