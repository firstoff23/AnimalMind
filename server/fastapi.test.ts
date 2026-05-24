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

  beforeAll(async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return;

    try {
      const supabase = createClient(url, key);
      const { error } = await supabase.from("users").select("id").limit(1);
      credentialsValid = !error;
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
      animalId: 1,
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

    // Mock global fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        state: "distress",
        confidence: 0.88,
        emoji: "🔴",
        model_used: "yamnet-acoustic-classifier"
      })
    });
    vi.stubGlobal("fetch", mockFetch);

    const mockBase64Audio = "UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="; 

    const result = await caller.classify.run({
      animalId: 1,
      audio: mockBase64Audio,
      audioMimeType: "audio/wav",
    });

    expect(mockFetch).toHaveBeenCalled();
    expect(result.state).toBe("distress");
    expect(result.confidence).toBe(0.88);
    expect(result.emoji).toBe("🔴");
    expect(result.model_used).toBe("yamnet"); // Mapped to yamnet

    vi.unstubAllGlobals();
  });
});
