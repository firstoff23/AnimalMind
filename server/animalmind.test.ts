import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB ──────────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getDemoUserId: vi.fn().mockResolvedValue(1),
  getOrCreateDemoUserId: vi.fn().mockResolvedValue(1),
  insertEvent: vi.fn().mockResolvedValue({ id: 99 }),
  getRecentEvents: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      animalId: 1,
      state: "relaxed",
      confidence: 0.91,
      emoji: "⚪",
      modelUsed: "yamnet",
      cached: false,
      feedback: null,
      createdAt: new Date(),
    },
  ]),
  getEventsPaginated: vi.fn().mockResolvedValue({
    events: [],
    total: 0,
  }),
  updateEventFeedback: vi.fn().mockResolvedValue(undefined),
  getAllEventsForExport: vi.fn().mockResolvedValue([]),
  getAnimalsByUser: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, name: "Bobi", species: "dog", breed: "Labrador", age: 3, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, userId: 1, name: "Mimi", species: "cat", breed: "Persa",    age: 5, isActive: false, createdAt: new Date(), updatedAt: new Date() },
  ]),
  addAnimal: vi.fn().mockResolvedValue({ id: 3, name: "Rex", species: "dog", breed: "Beagle", age: 2, isActive: false, userId: 1, createdAt: new Date(), updatedAt: new Date() }),
  setActiveAnimal: vi.fn().mockResolvedValue(undefined),
  getActiveAnimal: vi.fn().mockResolvedValue({ id: 1, name: "Bobi", species: "dog", isActive: true }),
  getWeeklyStats: vi.fn().mockResolvedValue([]),
  getSettings: vi.fn().mockResolvedValue({ notificationsEnabled: true, alertSensitivity: "medium" }),
  upsertSettings: vi.fn().mockResolvedValue({ notificationsEnabled: true, alertSensitivity: "medium" }),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  updateBeliefStateForAnimal: vi.fn().mockResolvedValue({
    relaxed: 0.5,
    excitement: 0.1,
    distress: 0.1,
    hunger: 0.1,
    alert: 0.1,
    attention: 0.1,
    updatedAt: new Date().toISOString()
  }),
  getLatestBeliefState: vi.fn().mockResolvedValue({
    relaxed: 0.5,
    excitement: 0.1,
    distress: 0.1,
    hunger: 0.1,
    alert: 0.1,
    attention: 0.1,
    updatedAt: new Date().toISOString()
  }),
  getEventBeliefState: vi.fn().mockResolvedValue(null),
  getEventPosture: vi.fn().mockResolvedValue(null),
  savePostureForEvent: vi.fn().mockResolvedValue("sitting"),
  shareReportWithVet: vi.fn().mockResolvedValue(true),
  verifyAnimalOwner: vi.fn().mockResolvedValue(undefined),
  getAnimalBaseline: vi.fn().mockResolvedValue({
    vocalizationThreshold: 10,
    normalStates: ["relaxed", "excitement"],
    alertSensitivity: "medium",
    updatedAt: new Date().toISOString()
  }),
  updateAnimalBaseline: vi.fn().mockResolvedValue({
    vocalizationThreshold: 10,
    normalStates: ["relaxed", "excitement"],
    alertSensitivity: "medium",
    updatedAt: new Date().toISOString()
  }),
  getAnimalById: vi.fn().mockResolvedValue({ id: 1, userId: 1, name: "Bobi", species: "dog", breed: "Labrador", age: 3 }),
  getEventsForAnimalPaginated: vi.fn().mockResolvedValue({ events: [], total: 0 }),
  getStatsForAnimal: vi.fn().mockResolvedValue({ dailyActivity: [], stateDistribution: {}, totalCount: 0 }),
  getUserByEmail: vi.fn().mockResolvedValue(undefined),
  createShareInvitation: vi.fn().mockResolvedValue({ id: 1, status: "pending" }),
  getPendingInvitations: vi.fn().mockResolvedValue([]),
  respondToInvitation: vi.fn().mockResolvedValue(true),
  getSharedAnimalsForUser: vi.fn().mockResolvedValue([]),
  getAnimalShares: vi.fn().mockResolvedValue([]),
  removeAnimalShare: vi.fn().mockResolvedValue(true)
}));

// ─── Context factory ──────────────────────────────────────────────────────────

function makeCtx(user: TrpcContext["user"] = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("classify.run", () => {
  it("retorna um resultado com os campos obrigatórios", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.classify.run({});
    expect(result).toHaveProperty("state");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("emoji");
    expect(result).toHaveProperty("model_used");
    expect(result).toHaveProperty("cached");
    expect(["distress","attention","excitement","hunger","alert","relaxed"]).toContain(result.state);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    expect(result.confidence).toBeLessThanOrEqual(1.0);
  }, 10000);

  it("aceita animalId opcional", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.classify.run({ animalId: 1 });
    expect(result.state).toBeDefined();
  }, 10000);
});

describe("animals.list", () => {
  it("devolve lista de animais do utilizador demo", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const animals = await caller.animals.list();
    expect(Array.isArray(animals)).toBe(true);
    expect(animals.length).toBeGreaterThanOrEqual(2);
    const names = animals.map((a) => a.name);
    expect(names).toContain("Bobi");
    expect(names).toContain("Mimi");
  });
});

describe("animals.add", () => {
  it("adiciona um novo animal", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const animal = await caller.animals.add({
      name: "Rex",
      species: "dog",
      breed: "Beagle",
      age: 2,
    });
    expect(animal?.name).toBe("Rex");
    expect(animal?.species).toBe("dog");
  });
});

describe("events.recent", () => {
  it("devolve os eventos recentes", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const events = await caller.events.recent({ limit: 5 });
    expect(Array.isArray(events)).toBe(true);
    if (events.length > 0) {
      expect(events[0]).toHaveProperty("state");
      expect(events[0]).toHaveProperty("confidence");
    }
  });
});

describe("events.list", () => {
  it("devolve lista paginada com total", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.events.list({ page: 1, pageSize: 10 });
    expect(result).toHaveProperty("events");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.events)).toBe(true);
  });
});

describe("events.feedback", () => {
  it("regista feedback sem erro", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.events.feedback({ eventId: 1, feedback: "correct" });
    expect(result.success).toBe(true);
  });
});

describe("settings.get", () => {
  it("devolve as definições padrão", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const s = await caller.settings.get();
    expect(s).toHaveProperty("notificationsEnabled");
    expect(s).toHaveProperty("alertSensitivity");
  });
});

describe("auth.logout", () => {
  it("limpa o cookie de sessão", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});
