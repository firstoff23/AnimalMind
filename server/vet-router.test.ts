import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn().mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        const builder: any = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          upsert: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(), single: vi.fn().mockImplementation(() => {
            if (table === "users") {
              return Promise.resolve({ data: { id: 1 }, error: null });
            }
            if (table === "animals") {
              return Promise.resolve({ data: { id: 1, user_id: 1, name: "Bobi", species: "dog" }, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          }),
          limit: vi.fn().mockImplementation(() => {
            if (table === "animals") {
              return Promise.resolve({ data: [{ id: 1, name: "Bobi", species: "dog", user_id: 1 }] });
            }
            return builder;
          }),
        };
        return builder;
      }),
    }),
  };
});

const VET_SHARES_FILE_PATH = path.resolve(import.meta.dirname, "vet_shares.json");
const VET_CLINICAL_NOTES_FILE_PATH = path.resolve(import.meta.dirname, "vet_clinical_notes.json");

function createMockContext(
  id: number,
  email: string,
  role: "owner" | "vet" | "admin" | "user"
): TrpcContext {
  return {
    user: {
      id,
      openId: `test-${role}-${id}`,
      email,
      name: role === "vet" ? "Dr. Teste" : "Tutor Teste",
      loginMethod: "demo",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };
}

describe("tRPC vetRouter", () => {
  let credentialsValid = false;
  let ownerAnimalId = 1;
  const vetEmail = "vet-router@animalmind.local";
  const ownerCtx = createMockContext(1, "demo@animalmind.local", "owner");
  const vetCtx = createMockContext(2, vetEmail, "vet");
  const ownerCaller = appRouter.createCaller(ownerCtx);
  const vetCaller = appRouter.createCaller(vetCtx);
  const nonVetCaller = appRouter.createCaller(createMockContext(3, "owner@animalmind.local", "owner"));

  beforeAll(async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return;

    try {
      const supabase = createClient(url, key);
      const { data: owner } = await supabase
        .from("users")
        .select("id")
        .eq("open_id", "demo-user-001")
        .single();
      if (!owner) return;
      ownerCtx.user.id = Number(owner.id);

      let { data: vet } = await supabase.from("users").select("id").eq("email", vetEmail).single();
      if (!vet) {
        const { data: inserted, error } = await supabase
          .from("users")
          .insert([
            {
              open_id: "vet-router-user",
              name: "Dr. Teste",
              email: vetEmail,
              login_method: "demo",
              role: "vet",
              last_signed_in: new Date().toISOString(),
            },
          ])
          .select()
          .single();
        if (error) throw error;
        vet = inserted;
      }
      vetCtx.user.id = Number(vet.id);

      const { data: animals } = await supabase
        .from("animals")
        .select("id")
        .eq("user_id", ownerCtx.user.id)
        .limit(1);
      if (animals?.[0]) {
        ownerAnimalId = Number(animals[0].id);
        credentialsValid = true;
      }
    } catch {
      credentialsValid = false;
    }
  });

  it("blocks non-vet users from clinical dashboards", async () => {
    await expect(nonVetCaller.vet.getAnimals({})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("lets vets list shared animals, load report data and save clinical notes", async () => {
    if (!credentialsValid) return;

    await ownerCaller.vet.shareReport({
      animalId: ownerAnimalId,
      name: "Dr. Teste",
      email: vetEmail,
      note: "Observar ansiedade em consultas futuras.",
    });

    const animals = await vetCaller.vet.getAnimals({});
    expect(animals.some((animal) => animal.id === ownerAnimalId)).toBe(true);

    const report = await vetCaller.vet.getReport({ animalId: ownerAnimalId, days: 30 });
    expect(report.animal.id).toBe(ownerAnimalId);
    expect(Array.isArray(report.events)).toBe(true);

    const saved = await vetCaller.vet.saveNotes({
      animalId: ownerAnimalId,
      notes: "Sem sinais clínicos urgentes no relatório.",
    });
    expect(saved).toEqual({
      success: true,
      notes: "Sem sinais clínicos urgentes no relatório.",
    });
  });

  afterAll(() => {
    [VET_SHARES_FILE_PATH, VET_CLINICAL_NOTES_FILE_PATH].forEach((filePath) => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
  });
});
