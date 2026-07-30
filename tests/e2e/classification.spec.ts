import { expect, test, loginAsMockUser } from "./fixtures";

test.describe("Visual Classification", () => {
  test("capture image, classify, and show results", async ({ page }) => {
    test.setTimeout(45_000);

    await loginAsMockUser(page);

    await page.goto("/camera");

    // Click "Ativar Câmara" / "Enable Camera" if prompted
    const enableCameraBtn = page.getByRole("button", { name: /Ativar Câmara|Enable Camera/i });
    if (await enableCameraBtn.isVisible()) {
      await enableCameraBtn.click();
    }

    // Check that the animal name/species is visible in the camera stream overlay
    await expect(page.getByText(/Cão|Dog/i).first()).toBeVisible();

    // Click to capture photo
    const captureBtn = page.getByRole("button", { name: /Tirar foto|Take photo/i }).first();
    await expect(captureBtn).toBeVisible({ timeout: 10_000 });
    await captureBtn.click();

    // Now wait for the Confirm button
    const confirmBtn = page.getByRole("button", { name: /Confirmar|Confirm/i }).first();
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Wait for mock result
    await expect(page.getByText(/92%/).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/RELAX/i).first()).toBeVisible();
  });
});
