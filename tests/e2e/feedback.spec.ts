import { expect, test, loginAsMockUser } from "./fixtures";

test.describe("Feedback", () => {
  test("submits feedback for a recent event", async ({ page }) => {
    test.setTimeout(45_000);
    await loginAsMockUser(page);

    await page.goto("/gravar");
    await expect(page.getByTestId("record-button")).toBeVisible();
    await page.getByTestId("record-button").click();

    // After 3s recording, the confirm button appears
    const confirmBtn = page.getByRole("button", { name: /Confirmar|Confirm/i }).first();
    await expect(confirmBtn).toBeVisible({ timeout: 10_000 });
    await confirmBtn.click();

    // Wait for event to be generated and form to appear
    await expect(page.getByText(/92%/).first()).toBeVisible({ timeout: 15_000 });

    // Open detailed feedback form
    await page.getByRole("button", { name: /Confirmar \/ Corrigir Detalhes|Confirm \/ Correct Details/i }).click();
    await page.locator("#feedback-comment-input").fill("Descreve o comportamento");
    
    // Click submit
    await page.getByRole("button", { name: /Submeter Feedback|Submit Feedback/i }).click();

    // Wait for success toast or form to disappear
    await expect(page.getByText(/Feedback guardado com sucesso|Feedback saved successfully/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
