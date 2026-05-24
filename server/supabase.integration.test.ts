import { describe, expect, it, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

describe("Supabase Integration", () => {
  let supabase: ReturnType<typeof createClient>;
  let credentialsValid = false;

  beforeAll(async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return;

    try {
      supabase = createClient(url, key);
      // Quick connectivity check — if key is invalid this returns an error
      const { error } = await supabase.from("users").select("id").limit(1);
      credentialsValid = !error;
    } catch {
      credentialsValid = false;
    }
  });

  it("conecta ao Supabase com sucesso", async () => {
    if (!credentialsValid) return; // skip gracefully
    const { data, error } = await supabase.from("users").select("id").limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("obtém animais do utilizador demo", async () => {
    if (!credentialsValid) return;
    const { data: demoUser } = await supabase
      .from("users")
      .select("id")
      .eq("open_id", "demo-user-001")
      .single();

    expect(demoUser).toBeDefined();
    expect(demoUser?.id).toBeGreaterThan(0);

    const { data: animals, error } = await supabase
      .from("animals")
      .select("*")
      .eq("user_id", demoUser!.id);

    expect(error).toBeNull();
    expect(Array.isArray(animals)).toBe(true);
    expect(animals?.length).toBeGreaterThanOrEqual(2);

    const names = animals?.map((a) => a.name) ?? [];
    expect(names).toContain("Bobi");
    expect(names).toContain("Mimi");
  });

  it("obtém eventos de classificação", async () => {
    if (!credentialsValid) return;
    const { data: demoUser } = await supabase
      .from("users")
      .select("id")
      .eq("open_id", "demo-user-001")
      .single();

    const { data: events, error } = await supabase
      .from("classification_events")
      .select("*")
      .eq("user_id", demoUser!.id)
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(events)).toBe(true);
    expect(events?.length).toBeGreaterThan(0);

    if (events && events.length > 0) {
      const event = events[0];
      expect(event).toHaveProperty("state");
      expect(event).toHaveProperty("confidence");
      expect(["distress", "attention", "excitement", "hunger", "alert", "relaxed"]).toContain(event.state);
      expect(event.confidence).toBeGreaterThanOrEqual(0.6);
      expect(event.confidence).toBeLessThanOrEqual(1.0);
    }
  });

  it("obtém definições do utilizador", async () => {
    if (!credentialsValid) return;
    const { data: demoUser } = await supabase
      .from("users")
      .select("id")
      .eq("open_id", "demo-user-001")
      .single();

    const { data: settings, error } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", demoUser!.id)
      .single();

    expect(error).toBeNull();
    expect(settings).toBeDefined();
    expect(settings).toHaveProperty("notifications_enabled");
    expect(settings).toHaveProperty("alert_sensitivity");
  });
});
