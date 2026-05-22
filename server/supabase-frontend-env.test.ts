import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

describe("Supabase Frontend Environment Variables", () => {
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

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
