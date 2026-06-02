import { expect, loginAsMockUser, test } from "./fixtures";

test.describe("PDF export", () => {
  test("downloads the animal clinical report PDF", async ({ page }) => {
    await loginAsMockUser(page);
    await page.goto("/animal/1");

    await expect(page.getByRole("heading", { name: "Bobi" })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("animal-detail-export-pdf").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
