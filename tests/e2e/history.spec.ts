import { expect, loginAsMockUser, test } from "./fixtures";

test.describe("history", () => {
  test("opens history, lists records, and applies the animal filter", async ({
    page,
  }) => {
    await loginAsMockUser(page);
    await page.goto("/historico");

    await expect(
      page.getByRole("button", { name: /Filtros|Filters/i }),
    ).toBeVisible();
    
    // Check if the mock event from fixtures appears (e.g. 92% confidence)
    await expect(page.getByText(/92%/).first()).toBeVisible();

    // Open filter
    await page.getByRole("button", { name: /Filtros|Filters/i }).click();
    await page.getByTestId("history-animal-filter-trigger").click();
    // Select Bobi
    await page.getByRole("option", { name: /Bobi/i }).click();

    await expect(page).toHaveURL(/animal=1/);
    
    // Verify 92% is still visible after filter
    await expect(page.getByText(/92%/).first()).toBeVisible();
  });
});
