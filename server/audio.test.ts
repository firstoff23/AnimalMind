import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createClient } from "@supabase/supabase-js";

function createMockContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "demo-user-001",
      email: "demo@animalmind.local",
      name: "Demo User",
      loginMethod: "demo",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };
}

describe("tRPC classify.run with audio", () => {
  const ctx = createMockContext();
  const caller = appRouter.createCaller(ctx);
  let credentialsValid = false;
  let testAnimalId = 1;

  beforeAll(async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return;

    try {
      const supabase = createClient(url, key);
      const { data: userData } = await supabase.from("users").select("id").eq("open_id", "demo-user-001").single();
      if (userData) {
        ctx.user.id = Number(userData.id);
        credentialsValid = true;
      }
      
      if (credentialsValid) {
        const { data: animals } = await supabase.from("animals").select("id").eq("user_id", ctx.user.id).limit(1);
        if (animals && animals.length > 0) {
          testAnimalId = Number(animals[0].id);
        }
      }
    } catch {
      credentialsValid = false;
    }
  });

  it("accepts base64 audio and runs without crashing", async () => {
    if (!credentialsValid) return; // Skip gracefully if Supabase credentials are not valid (e.g. local dev without keys)
    
    const mockBase64Audio = "UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="; 
    
    const result = await caller.classify.run({
      animalId: testAnimalId,
      audio: mockBase64Audio,
      audioMimeType: "audio/wav",
    });

    expect(result).toHaveProperty("state");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("emoji");
    expect(result).toHaveProperty("eventId");
    expect(result).toHaveProperty("audioUrl");
  }, 15_000);
});
