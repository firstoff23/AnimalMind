import { expect, loginAsMockUser, test } from "./fixtures";

test.describe("login", () => {
  test("logs in with mocked email and password and redirects to dashboard", async ({ page }) => {
    await loginAsMockUser(page);

    await expect(page.getByRole("button", { name: /sair/i })).toBeVisible();
    await expect(page.getByText("Bobi").first()).toBeVisible();
  });
});
