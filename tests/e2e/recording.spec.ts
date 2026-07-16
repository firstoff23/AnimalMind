import { expect, loginAsMockUser, test } from "./fixtures";

test.describe("recording", () => {
  test("records mocked audio, classifies it, and shows the event in history", async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await loginAsMockUser(page);
    await page.goto("/gravar");

    await expect(page.getByTestId("record-button")).toBeVisible();
    await page.getByTestId("record-button").click();

    await expect(page.getByText(/92%/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/yamnet-e2e/i)).toBeVisible();

    await page.goto("/historico");
    await expect(page.getByText("Bobi").first()).toBeVisible();
    await expect(page.getByText(/92%/).first()).toBeVisible();
  });
});
