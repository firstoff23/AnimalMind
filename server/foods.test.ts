import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

// Sample mock data for foods
const mockFoods = [
  {
    id: "f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    name: "Uva",
    aliases: ["grape", "uvas", "passa", "raisin"],
    safe_for: [],
    dangerous_for: [],
    toxic_for: ["dog", "cat"],
    severity: "toxic",
    reason: "Pode causar falha renal aguda.",
    symptoms: ["Vómitos", "Letargia"],
    what_to_do: "Contacte o veterinário imediatamente.",
    sources: ["ASPCA"],
    created_at: new Date().toISOString(),
  },
  {
    id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e",
    name: "Cenoura",
    aliases: ["carrot", "cenouras"],
    safe_for: ["dog", "cat", "rabbit"],
    dangerous_for: [],
    toxic_for: [],
    severity: "safe",
    reason: "Excelente snack rico em fibras.",
    symptoms: [],
    what_to_do: "Pode servir crua ou cozida.",
    sources: ["AKC"],
    created_at: new Date().toISOString(),
  },
  {
    id: "b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6f",
    name: "Leite",
    aliases: ["milk", "lactose"],
    safe_for: [],
    dangerous_for: ["dog", "cat"],
    toxic_for: [],
    severity: "caution",
    reason: "Intolerância à lactose.",
    symptoms: ["Diarreia", "Gases"],
    what_to_do: "Evite lacticínios normais.",
    sources: ["Cornell Vet"],
    created_at: new Date().toISOString(),
  },
];

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn().mockReturnValue({
      from: vi.fn().mockImplementation((_table: string) => {
        const builder: any = {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockImplementation(() => {
            return Promise.resolve({ data: mockFoods, error: null });
          }),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockImplementation(() => {
            return Promise.resolve({ data: mockFoods[0], error: null });
          }),
        };
        return builder;
      }),
    }),
  };
});

function createMockContext(): TrpcContext {
  return {
    user: null, // guest user
    req: {} as any,
    res: {} as any,
  };
}

describe("tRPC foodsRouter", () => {
  const ctx = createMockContext();
  const caller = appRouter.createCaller(ctx);

  it("can list all foods and compute severity without species", async () => {
    const foods = await caller.foods.getAll();
    expect(foods.length).toBeGreaterThan(0);
    expect(foods[0].name).toBe("Uva");
    expect(foods[0].computedSeverity).toBe("toxic");
  });

  it("can list all foods and compute severity for a specific species (dog)", async () => {
    const foods = await caller.foods.getAll({ species: "dog" });
    const cenoura = foods.find((f) => f.name === "Cenoura");
    expect(cenoura).toBeDefined();
    expect(cenoura!.computedSeverity).toBe("safe");

    const leite = foods.find((f) => f.name === "Leite");
    expect(leite).toBeDefined();
    expect(leite!.computedSeverity).toBe("dangerous");
  });

  it("can get a food by id", async () => {
    const food = await caller.foods.getById({ id: mockFoods[0].id });
    expect(food.name).toBe("Uva");
  });

  it("can search for foods by name", async () => {
    const results = await caller.foods.search({ query: "uva", species: "dog" });
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Uva");
    expect(results[0].computedSeverity).toBe("toxic");
  });

  it("can search for foods by alias/synonym", async () => {
    const results = await caller.foods.search({
      query: "carrot",
      species: "rabbit",
    });
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Cenoura");
    expect(results[0].computedSeverity).toBe("safe");
  });
});
