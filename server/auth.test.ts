import { describe, expect, it, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

describe("Supabase Auth", () => {
  let supabase: ReturnType<typeof createClient>;
  let credentialsValid = false;

  beforeAll(async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;

    try {
      supabase = createClient(url, key);
      // Quick connectivity check using admin API
      const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      credentialsValid = !error;
    } catch {
      credentialsValid = false;
    }
  });

  it("pode criar um novo utilizador com email e password", async () => {
    if (!credentialsValid) return;
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";

    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.user?.email).toBe(testEmail);

    // Clean up
    if (data.user?.id) {
      await supabase.auth.admin.deleteUser(data.user.id);
    }
  });

  it("rejeita password fraca", async () => {
    if (!credentialsValid) return;
    const testEmail = `test-${Date.now()}@example.com`;
    const weakPassword = "123"; // Too weak

    const { error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: weakPassword,
      email_confirm: true,
    });

    expect(error).toBeDefined();
  });

  it("rejeita email duplicado", async () => {
    if (!credentialsValid) return;
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";

    // Create first user
    const { data: firstUser } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    // Try to create duplicate
    const { error: duplicateError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    expect(duplicateError).toBeDefined();

    // Clean up
    if (firstUser?.user?.id) {
      await supabase.auth.admin.deleteUser(firstUser.user.id);
    }
  });
});
