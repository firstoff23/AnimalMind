import { expect, test } from "./fixtures";

test.describe("desktop mobile-only notice", () => {
  test.use({
    hasTouch: false,
    isMobile: false,
    viewport: { width: 1024, height: 768 },
  });

  test("shows the mobile-only QR notice on screens from 768px", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "O Pawra foi feito para mobile" }),
    ).toBeVisible();
    await expect(page.getByAltText(/QR code para abrir/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "pawra.vercel.app" }),
    ).toHaveAttribute("href", "https://pawra.vercel.app");
  });
});
