import { expect, test, loginAsMockUser } from "./fixtures";

test.describe("Auth flows", () => {
  test("user can login and logout successfully", async ({ page }) => {
    // Uses the login fixture
    await loginAsMockUser(page);

    await expect(page.getByText("Bobi").first()).toBeVisible();

    // Navigate to settings to logout
    await page.goto("/definicoes");

    // Click logout
    const logoutBtn = page.getByRole("button", { name: /terminar sessão|sign out/i });
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Verify redirect to login or landing page
    await expect(page).toHaveURL(/(\/login|\/)/);
  });

  test("user can register a new account", async ({ page }) => {
    // Override auth checks to simulate logged out user
    await page.route("https://test.supabase.co/**/auth/v1/user", async (route) => {
      await route.fulfill({ status: 401, body: "{}" });
    });
    await page.route("https://test.supabase.co/**/auth/v1/signup", async (route) => {
      await route.fulfill({ status: 200, body: "{}" });
    });

    await page.goto("/registo");

    await page.locator("#register-name").fill("New E2E User");
    await page.locator("#register-email").fill("newuser.e2e@example.test");
    await page.locator("#register-password").fill("password-e2e");
    
    // Accept age gate
    await page.locator("#register-age-gate").click();

    // Click register
    await page.getByRole("button", { name: /^Criar conta/i }).click();

    // Verify it navigated to home/dashboard
    await expect(page).toHaveURL(/(\/|\/dashboard)$/);
  });
});
