import { expect, test, loginAsMockUser, mockUserEmail } from "./fixtures";

test.describe("Account Deletion", () => {
  test("can delete account and get redirected", async ({ page }) => {
    test.setTimeout(45_000);
    await loginAsMockUser(page);

    await page.goto("/definicoes");

    // Click on Danger Zone Delete
    await page.getByRole("button", { name: /^Apagar Conta$|^Delete Account$/i }).first().click();

    // Confirm dialog (does not require email)
    await page.getByRole("button", { name: /Sim, apagar conta|Yes, delete account/i }).click();

    // Should open the confirmation dialog requiring email
    const confirmInput = page.getByPlaceholder(/O teu email|Your email/i);
    await expect(confirmInput).toBeVisible({ timeout: 10_000 });
    await confirmInput.fill(mockUserEmail);

    // Click confirm
    const confirmBtn = page.getByRole("button", { name: /Sim, Apagar Definitivamente|Yes, Delete Permanently/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Should redirect to login or landing page
    await expect(page).toHaveURL(/(\/login|\/)/);
  });
});
