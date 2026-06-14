import { createClient } from "@supabase/supabase-js";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

vi.mock("@supabase/supabase-js", () => {
  let lastInsertData: any = {};
  return {
    createClient: vi.fn().mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockImplementation(() =>
            Promise.resolve({
              data: { path: "audio/test.mp3" },
              error: null,
            }),
          ),
          createSignedUrl: vi.fn().mockImplementation(() =>
            Promise.resolve({
              data: { signedUrl: "https://mock-signed-url.com" },
              error: null,
            }),
          ),
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        let _lastEqValue: any = null;
        const builder: any = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockImplementation((data: any) => {
            const item = Array.isArray(data) ? data[0] : data;
            lastInsertData = { ...lastInsertData, ...item };
            return builder;
          }),
          update: vi.fn().mockImplementation((data: any) => {
            lastInsertData = { ...lastInsertData, ...data };
            return builder;
          }),
          upsert: vi.fn().mockImplementation((data: any) => {
            const item = Array.isArray(data) ? data[0] : data;
            lastInsertData = { ...lastInsertData, ...item };
            return builder;
          }),
          eq: vi.fn().mockImplementation((_col: string, val: any) => {
            _lastEqValue = val;
            return builder;
          }),
          gte: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockImplementation(() => {
            if (table === "users") {
              return Promise.resolve({ data: { id: 1 }, error: null });
            }
            if (table === "animals") {
              return Promise.resolve({
                data: {
                  id: 1,
                  user_id: 1,
                  name: "Bobi",
                  species: "dog",
                  baseline_data: {},
                },
                error: null,
              });
            }
            if (table === "classification_events") {
              return Promise.resolve({
                data: { id: 123, ...lastInsertData },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
          maybeSingle: vi.fn().mockImplementation(() => {
            if (table === "classification_events") {
              return Promise.resolve({
                data: {
                  id: 123,
                  belief_state: {
                    relaxed: 0.5,
                    excitement: 0.1,
                    distress: 0.1,
                    hunger: 0.1,
                    alert: 0.1,
                    attention: 0.1,
                    updatedAt: new Date().toISOString(),
                  },
                },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
          then: vi.fn().mockImplementation((resolve) => {
            return resolve({ data: [], error: null });
          }),
        };
        return builder;
      }),
    }),
  };
});

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
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return;

    try {
      const supabase = createClient(url, key);
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("open_id", "demo-user-001")
        .single();
      if (userData) {
        ctx.user.id = Number(userData.id);
        credentialsValid = true;
      }

      if (credentialsValid) {
        const { data: animals } = await supabase
          .from("animals")
          .select("id")
          .eq("user_id", ctx.user.id)
          .limit(1);
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
      if (
        url.includes("classify") ||
        url.includes("fly.dev") ||
        url.includes("hf.space")
      ) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            state: "relaxed",
            confidence: 0.95,
            emoji: "⚪",
            model_used: "yamnet",
          }),
        });
      }
      return originalFetch(input, init);
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  it("can get belief state for an animal", async () => {
    if (!credentialsValid) return;

    const belief = await caller.animals.getBeliefState({
      animalId: testAnimalId,
    });
    expect(belief).toHaveProperty("relaxed");
    expect(belief).toHaveProperty("distress");
    expect(belief).toHaveProperty("updatedAt");
  });

  it("can run classification with posture and update belief state", async () => {
    if (!credentialsValid) return;

    const mockBase64Audio =
      "UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
    const result = await caller.classify.run({
      animalId: testAnimalId,
      posture: "sitting",
      audio: mockBase64Audio,
      audioMimeType: "audio/wav",
    });

    expect(result).toHaveProperty("eventId");
    expect(result.posture).toBe("sitting");
    expect(result.beliefState).toHaveProperty("relaxed");

    const visualMetadata = await caller.events.getVisualMetadata({
      eventId: result.eventId,
    });
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
});
