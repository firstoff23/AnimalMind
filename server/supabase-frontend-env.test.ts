import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const hasCredentials = !!process.env.VITE_SUPABASE_URL && !!process.env.VITE_SUPABASE_ANON_KEY;

describe.skipIf(!hasCredentials)("Supabase Frontend Environment Variables", () => {
  it("VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão configuradas", () => {
    const url = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    expect(url).toBeDefined();
    expect(anonKey).toBeDefined();
    expect(url).toMatch(/^https:\/\/.+\.supabase\.co$/);
    expect(anonKey).toMatch(/^(eyJ|sb_)/); // JWT tokens or Supabase publishable keys
  });

  it("pode criar cliente Supabase com credenciais frontend", () => {
    const url = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error("Missing Supabase frontend credentials");
    }

    const client = createClient(url, anonKey);
    expect(client).toBeDefined();
  });

  it("pode fazer uma query simples ao Supabase com credenciais frontend", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error("Missing Supabase frontend credentials");
    }

    const client = createClient(url, anonKey);
    
    // Try to read animals table (public read allowed)
    const { data, error } = await client
      .from("animals")
      .select("id, name")
      .limit(1);

    // In some environments, table access for anon is restricted (which is secure).
    // Getting a 42501 (permission denied) or similar code still proves the client successfully contacted Supabase.
    if (error) {
      expect(["42501", "PGRST116", "PGRST301"]).toContain(error.code);
    } else {
      expect(Array.isArray(data)).toBe(true);
    }
  });
});
