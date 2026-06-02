import { expect, loginAsMockUser, test } from "./fixtures";

test.describe("history", () => {
  test("opens history, lists records, and applies the animal filter", async ({ page }) => {
    await loginAsMockUser(page);
    await page.goto("/historico");

    await expect(page.getByRole("button", { name: /Filtros|Filters/i })).toBeVisible();
    await expect(page.getByText("Bobi").first()).toBeVisible();
    await expect(page.getByText(/92%/).first()).toBeVisible();

    await page.getByRole("button", { name: /Filtros|Filters/i }).click();
    await page.getByTestId("history-animal-filter-trigger").click();
    await page.getByRole("option", { name: /Bobi/i }).click();

    await expect(page).toHaveURL(/animal=1/);
    await expect(page.getByText("Bobi").first()).toBeVisible();
  });
});
