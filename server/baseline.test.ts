import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const BASELINES_FILE_PATH = path.resolve(import.meta.dirname, "baselines.json");

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

describe("tRPC animals and baselines", () => {
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
        // Fetch an animal ID that belongs to the demo user to run our integration tests
        const { data: animals } = await supabase.from("animals").select("id").eq("user_id", ctx.user.id).limit(1);
        if (animals && animals.length > 0) {
          testAnimalId = Number(animals[0].id);
        }
      }
    } catch {
      credentialsValid = false;
    }
  });

  it("can get default baseline for an animal", async () => {
    if (!credentialsValid) return;

    const baseline = await caller.animals.getBaseline({ animalId: testAnimalId });
    expect(baseline).toHaveProperty("vocalizationThreshold");
    expect(baseline).toHaveProperty("normalStates");
    expect(baseline).toHaveProperty("alertSensitivity");
  });

  it("can update animal baseline", async () => {
    if (!credentialsValid) return;

    const newBaseline = await caller.animals.updateBaseline({
      animalId: testAnimalId,
      vocalizationThreshold: 15,
      normalStates: ["relaxed", "excitement", "hunger"],
      alertSensitivity: "high",
    });

    expect(newBaseline.vocalizationThreshold).toBe(15);
    expect(newBaseline.normalStates).toContain("hunger");
    expect(newBaseline.alertSensitivity).toBe("high");

    // Retrieve again to verify persistence
    const retrieved = await caller.animals.getBaseline({ animalId: testAnimalId });
    expect(retrieved.vocalizationThreshold).toBe(15);
    expect(retrieved.alertSensitivity).toBe("high");
  });

  it("can get single animal details", async () => {
    if (!credentialsValid) return;

    const animal = await caller.animals.get({ animalId: testAnimalId });
    expect(animal).toHaveProperty("id");
    expect(animal).toHaveProperty("name");
    expect(animal.id).toBe(testAnimalId);
  });

  it("can get stats for animal", async () => {
    if (!credentialsValid) return;

    const stats = await caller.events.statsForAnimal({ animalId: testAnimalId, days: 7 });
    expect(stats).toHaveProperty("dailyActivity");
    expect(stats).toHaveProperty("stateDistribution");
    expect(stats).toHaveProperty("totalCount");
    expect(Array.isArray(stats.dailyActivity)).toBe(true);
    expect(stats.dailyActivity.length).toBe(7);
  });

  it("can list paginated events for animal", async () => {
    if (!credentialsValid) return;

    const res = await caller.events.listForAnimal({ animalId: testAnimalId, page: 1, pageSize: 5 });
    expect(res).toHaveProperty("events");
    expect(res).toHaveProperty("total");
    expect(Array.isArray(res.events)).toBe(true);
  });

  afterAll(() => {
    // Clean up our changes to baselines.json for testAnimalId
    try {
      if (fs.existsSync(BASELINES_FILE_PATH)) {
        const content = fs.readFileSync(BASELINES_FILE_PATH, "utf8");
        const baselines = JSON.parse(content);
        delete baselines[testAnimalId];
        fs.writeFileSync(BASELINES_FILE_PATH, JSON.stringify(baselines, null, 2), "utf8");
      }
    } catch (e) {
      console.error(e);
    }
  });
});
