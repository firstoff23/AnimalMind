import { beforeEach, describe, expect, it, vi } from "vitest";

const { singleResponses, insertPayloads } = vi.hoisted(() => ({
  singleResponses: [] as Array<{ data: any; error: any }>,
  insertPayloads: [] as any[],
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({
    from: vi.fn().mockImplementation(() => {
      const builder: any = {};
      builder.insert = vi.fn().mockImplementation((payload) => {
        insertPayloads.push(structuredClone(payload));
        return builder;
      });
      builder.select = vi.fn().mockImplementation(() => builder);
      builder.single = vi.fn().mockImplementation(() => Promise.resolve(singleResponses.shift()));
      return builder;
    }),
  }),
}));

describe("animal physical fields database compatibility", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    singleResponses.length = 0;
    insertPayloads.length = 0;
  });

  it("saves the animal after removing optional fields missing from an older Supabase schema", async () => {
    singleResponses.push(
      {
        data: null,
        error: {
          code: "PGRST204",
          message: "Could not find the 'tail' column of 'animals' in the schema cache",
        },
      },
      {
        data: {
          id: 10,
          user_id: 1,
          name: "Yoshi",
          species: "cat",
          breed: "Indefinida / Desconhecida",
          age: 10,
          is_active: false,
        },
        error: null,
      },
    );

    const { addAnimal } = await import("./db");
    const animal = await addAnimal({
      userId: 1,
      name: "Yoshi",
      species: "cat",
      breed: "Indefinida / Desconhecida",
      age: 10,
      tail: "long",
    });

    expect(animal?.name).toBe("Yoshi");
    expect(insertPayloads).toHaveLength(2);
    expect(insertPayloads[0][0]).toHaveProperty("tail", "long");
    expect(insertPayloads[1][0]).not.toHaveProperty("tail");
  });
});
