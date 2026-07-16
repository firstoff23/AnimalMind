import { expect, test } from "./fixtures";

test.describe("auth callback", () => {
  test("confirms a mocked email verification callback in-app", async ({
    page,
  }) => {
    await page.goto("/auth/callback?code=e2e-verification-code");

    await expect(page.getByText(/Email verificado com sucesso/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/, { timeout: 5_000 });
  });
});
