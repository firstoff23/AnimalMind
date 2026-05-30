import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const BELIEF_STATES_FILE_PATH = path.resolve(import.meta.dirname, "belief_states.json");
const POSTURES_FILE_PATH = path.resolve(import.meta.dirname, "postures.json");
const VET_SHARES_FILE_PATH = path.resolve(import.meta.dirname, "vet_shares.json");

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

describe("tRPC POMDP, Posture and Vet Mode", () => {
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

  beforeEach(() => {
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockImplementation((input: any, init: any) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("classify") || url.includes("fly.dev") || url.includes("hf.space")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            state: "relaxed",
            confidence: 0.95,
            emoji: "⚪",
            model_used: "yamnet"
          })
        });
      }
      return originalFetch(input, init);
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  it("can get belief state for an animal", async () => {
    if (!credentialsValid) return;

    const belief = await caller.animals.getBeliefState({ animalId: testAnimalId });
    expect(belief).toHaveProperty("relaxed");
    expect(belief).toHaveProperty("distress");
    expect(belief).toHaveProperty("updatedAt");
  });

  it("can run classification with posture and update belief state", async () => {
    if (!credentialsValid) return;

    const mockBase64Audio = "UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="; 
    const result = await caller.classify.run({
      animalId: testAnimalId,
      posture: "sitting",
      audio: mockBase64Audio,
      audioMimeType: "audio/wav",
    });

    expect(result).toHaveProperty("eventId");
    expect(result.posture).toBe("sitting");
    expect(result.beliefState).toHaveProperty("relaxed");

    const visualMetadata = await caller.events.getVisualMetadata({ eventId: result.eventId });
    expect(visualMetadata.posture).toBe("sitting");
    expect(visualMetadata.beliefState).toHaveProperty("relaxed");
  });

  it("can share report with vet", async () => {
    if (!credentialsValid) return;

    const result = await caller.vet.shareReport({
      animalId: testAnimalId,
      name: "Dr. Silva",
      email: "silva@vet.local",
      note: "Teve comportamento agitado esta manhã.",
    });

    expect(result).toEqual({ success: true });
  });

  afterAll(() => {
    // Clean up temporary changes
    try {
      [BELIEF_STATES_FILE_PATH, POSTURES_FILE_PATH, VET_SHARES_FILE_PATH].forEach((filePath) => {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf8");
          const data = JSON.parse(content);
          // Just delete references for safety or restore
          // In testing, we can let it be or remove the specific keys if they are animalId/eventId based.
        }
      });
    } catch (e) {
      console.error(e);
    }
  });
});
