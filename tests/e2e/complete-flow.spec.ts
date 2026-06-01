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

  const onboardingStart = page.getByRole("button", { name: "Começar" });
  try {
    await onboardingStart.waitFor({ state: "visible", timeout: 5_000 });
    await onboardingStart.click();
  } catch {
    // Onboarding is localStorage-gated
  }

  await expect(page.getByRole("button", { name: /sair|terminar sessão/i })).toBeVisible({
    timeout: 20_000,
  });
}

test.describe("AnimalMind Complete Flow E2E Test", () => {
  test("creates an animal with advanced fields, views details, and records sound successfully", async ({ page }) => {
    test.setTimeout(120_000);

    // 1. Login
    await login(page);

    // 2. Go to Profile Page
    await page.goto("/perfil");
    await expect(page.getByRole("heading", { name: /perfil|profile/i }).first()).toBeVisible();

    // 3. Open add animal drawer
    await page.getByRole("button", { name: /adicionar|add/i }).first().click();

    // 4. Fill form fields
    const uniqueAnimalName = `Pipoca E2E ${Date.now()}`;
    await page.locator("#name").fill(uniqueAnimalName);

    // Select Species: defaults to dog, but let's click to be sure
    await page.getByRole("button", { name: /cão|dog/i }).click();

    // Select custom breed
    const breedSelect = page.locator("#breed");
    await breedSelect.selectOption("other");
    await page.getByPlaceholder(/raça|breed/i).fill("SRD Mixed");

    // Other details
    await page.locator("#age").fill("3");
    await page.locator("#color").fill("Preto e Branco");
    await page.locator("#dateOfBirth").fill("2023-05-15");

    // Sex button click
    await page.getByRole("button", { name: /fêmea|female/i }).click();

    // Coat button click
    await page.getByRole("button", { name: /curto|short/i }).click();

    // Microchip
    await page.locator("#microchipNumber").fill("900115000111222");

    // Height & Tail
    await page.locator("#height").fill("35 cm");
    const tailSelect = page.locator("#tail");
    await tailSelect.selectOption("docked");

    // Special Markings
    await page.locator("#specialMarkings").fill("Mancha branca no peito e cicatriz");

    // Submit form
    await page.getByRole("button", { name: /guardar|save/i }).click();

    // Confirm animal card is created
    const newAnimalCard = page.getByRole("button", { name: new RegExp(uniqueAnimalName, "i") }).first();
    await expect(newAnimalCard).toBeVisible({ timeout: 15_000 });

    // 5. Navigate to Animal Detail Page
    await newAnimalCard.click();
    await expect(page.locator("h1", { hasText: uniqueAnimalName })).toBeVisible({ timeout: 10_000 });

    // Switch to Health Bulletin / Bulletin tab
    await page.getByRole("button", { name: /boletim|bulletin/i }).click();

    // Confirm height, tail and special markings are correctly displayed
    await expect(page.getByText("35 cm")).toBeVisible();
    await expect(page.getByText(/Mancha branca no peito e cicatriz/)).toBeVisible();

    // 6. Go to Recording Page
    await page.goto("/gravar");
    await expect(page.getByRole("heading", { name: "AnimalMind" }).first()).toBeVisible();
    await expect(page.getByTestId("record-button")).toBeVisible();

    // Start recording
    await page.getByTestId("record-button").click();

    // Verify it records and analyzes
    await expect(
      page.getByText(/A gravar e analisar|Recording and analyzing|A analisar dados acústicos|Analyzing acoustic data/i)
    ).toBeVisible({ timeout: 10_000 });

    // Wait for the result progress bar (which indicates classification completed)
    await expect(
      page.getByRole("progressbar", { name: /Confiança da classificação/i })
    ).toBeVisible({ timeout: 60_000 });

    // Verify that the result card is shown and indicates YAMNet/ML model was used, not offline TFJS
    const modelBadge = page.getByText(/yamnet-tfhub|yamnet/i);
    await expect(modelBadge).toBeVisible({ timeout: 10_000 });
  });
});
