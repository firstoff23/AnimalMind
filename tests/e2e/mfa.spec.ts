import { expect, test, loginAsMockUser } from "./fixtures";

test.describe("MFA Configuration", () => {
  test("can enable MFA", async ({ page }) => {
    await loginAsMockUser(page);

    await page.goto("/definicoes");

    // Find MFA section and click setup
    const setupBtn = page.getByRole("button", { name: /Configurar MFA|Set Up MFA/i });
    await expect(setupBtn).toBeVisible();
    await setupBtn.click();

    // Wait for the QR code step - it renders an img tag from qrserver.com
    await expect(page.locator("img[alt='QR Code TOTP']")).toBeVisible();
    
    // Click continue to verification
    await page.getByRole("button", { name: /Continuar|Continue/i }).click();

    // Verify the MFA setup with a dummy code
    await page.getByPlaceholder(/000000/i).fill("123456");
    await page.getByRole("button", { name: /Verificar e Ativar|Verify and Enable/i }).click();

    // Should show success
    await expect(page.getByText(/MFA ativado|MFA enabled/i).first()).toBeVisible();
  });
});
