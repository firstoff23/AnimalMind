import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
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

describe("tRPC classify.run with FastAPI backend", () => {
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

  it("falls back to random classification when FastAPI is offline/invalid url", async () => {
    if (!credentialsValid) return; // Skip if no Supabase credentials

    // Set an invalid FastAPI URL
    process.env.FASTAPI_BACKEND_URL = "http://localhost:9999-invalid-port";

    const mockBase64Audio = "UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="; 

    // Should not throw, should fall back to random classification
    const result = await caller.classify.run({
      animalId: testAnimalId,
      audio: mockBase64Audio,
      audioMimeType: "audio/wav",
    });

    expect(result).toHaveProperty("state");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("emoji");
    expect(result.model_used).toBeDefined();
  });

  it("uses FastAPI response when it is online and returns valid data", async () => {
    if (!credentialsValid) return;

    process.env.FASTAPI_BACKEND_URL = "http://localhost:8000";

    // Mock global fetch conditionally to not break Supabase queries
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockImplementation((input: any, init: any) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("localhost:8000") || url.includes("classify")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            state: "distress",
            confidence: 0.88,
            emoji: "🔴",
            model_used: "yamnet-acoustic-classifier"
          })
        });
      }
      return originalFetch(input, init);
    });
    vi.stubGlobal("fetch", mockFetch);

    const mockBase64Audio = "UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="; 

    const result = await caller.classify.run({
      animalId: testAnimalId,
      audio: mockBase64Audio,
      audioMimeType: "audio/wav",
    });

    expect(mockFetch).toHaveBeenCalled();
    expect(result.state).toBe("distress");
    expect(result.confidence).toBe(0.88);
    expect(result.emoji).toBe("🔴");
    expect(result.model_used).toBe("yamnet"); // Mapped to yamnet

    vi.unstubAllGlobals();
  }, 15000);
});
