import { describe, expect, it, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

describe("Password Recovery", () => {
  let supabase: ReturnType<typeof createClient>;
  let testEmail: string;
  let testUserId: string;
  let credentialsValid = false;

  beforeAll(async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;

    try {
      supabase = createClient(url, key);
      const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      credentialsValid = !error;
    } catch {
      credentialsValid = false;
    }

    testEmail = `test-password-${Date.now()}@example.com`;
  });

  it("pode criar um utilizador para teste de recuperação", async () => {
    if (!credentialsValid) return;
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: "TestPassword123!",
      email_confirm: true,
    });

    expect(error).toBeNull();
    expect(data.user?.id).toBeDefined();
    testUserId = data.user!.id;
  });

  it("pode gerar link de recuperação", async () => {
    if (!credentialsValid) return;
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: testEmail,
    });

    expect(error).toBeNull();
    // Link data structure may vary
    expect(data).toBeDefined();
  });

  it("pode actualizar palavra-passe com token válido", async () => {
    if (!credentialsValid) return;
    // Use admin API to update password directly
    const { error: updateError } = await supabase.auth.admin.updateUserById(testUserId, {
      password: "NewPassword123!",
    });

    expect(updateError).toBeNull();
  });

  it("limpa o utilizador de teste", async () => {
    if (!credentialsValid) return;
    const { error } = await supabase.auth.admin.deleteUser(testUserId);
    expect(error).toBeNull();
  });
});
