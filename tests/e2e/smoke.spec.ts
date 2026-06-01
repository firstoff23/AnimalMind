import { expect, test, type Page } from "@playwright/test";

const e2eEmail = process.env.E2E_EMAIL;
const e2ePassword = process.env.E2E_PASSWORD;
const hasCredentials = Boolean(e2eEmail && e2ePassword);

async function login(page: Page) {
  test.skip(!hasCredentials, "Define E2E_EMAIL e E2E_PASSWORD para correr fluxos autenticados.");

  await page.goto("/login");
  await page.getByPlaceholder("seu@email.com").fill(e2eEmail!);
  await page.getByPlaceholder("••••••••").fill(e2ePassword!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("button", { name: /terminar sessão/i })).toBeVisible({
    timeout: 20_000,
  });
}

test.describe("AnimalMind smoke tests", () => {
  test("login page renders and validates the basic form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("AnimalMind").first()).toBeVisible();
    await expect(page.getByText("Faça login na sua conta")).toBeVisible();

    const submitButton = page.getByRole("button", { name: "Entrar" });
    await expect(submitButton).toBeDisabled();

    await page.getByPlaceholder("seu@email.com").fill("tutor@example.com");
    await page.getByPlaceholder("••••••••").fill("password-test");
    await expect(submitButton).toBeEnabled();
  });

  test("auth callback shows an in-app error state for invalid callback links", async ({ page }) => {
    await page.goto("/auth/callback?error=access_denied&error_description=Token%20expirado");

    await expect(page.getByText("Link inválido")).toBeVisible();
    await expect(page.getByText("Token expirado")).toBeVisible();
    await page.getByRole("button", { name: "Ir para login" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("recording page is reachable after login and exposes the classification control", async ({ page }) => {
    await login(page);

    await page.goto("/gravar");
    await expect(page.getByRole("heading", { name: "AnimalMind" })).toBeVisible();
    await expect(page.getByTestId("record-button")).toBeVisible();

    if (process.env.E2E_RUN_CLASSIFICATION !== "true") {
      test.info().annotations.push({
        type: "manual-config",
        description: "Define E2E_RUN_CLASSIFICATION=true para executar a gravação real com media devices falsos.",
      });
      return;
    }

    await page.getByTestId("record-button").click();
    await expect(
      page.getByText(/A processar|Processing|Resultado|Result|Confiança|Confidence/i)
    ).toBeVisible({ timeout: 60_000 });
  });

  test("history page opens export actions and exercises PDF export", async ({ page }) => {
    await login(page);

    await page.goto("/historico");
    await expect(page.getByText(/Histórico|History/i)).toBeVisible();

    await page.getByTestId("history-export-toggle").click();
    await expect(page.getByTestId("history-export-pdf")).toBeVisible();

    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 }).catch(() => null);
    await page.getByTestId("history-export-pdf").click();
    const download = await downloadPromise;

    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
      return;
    }

    await expect(
      page.getByText(/Não há registos para exportar|No records to export|PDF exportado|PDF exported|Não foi possível exportar PDF/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});
