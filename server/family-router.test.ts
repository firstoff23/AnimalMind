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
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockImplementation(() => {
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
          then: vi.fn().mockImplementation((resolve) => {
            if (table === "family_members" || table === "family_animals") {
              return resolve({ data: null, error: new Error("Mock database offline") });
            }
            return resolve({ data: [], error: null });
          }),
        };
        return builder;
      }),
    }),
  };
});

const FAMILIES_FILE_PATH = path.resolve(import.meta.dirname, "families.json");

function createMockContext(id: number, email: string): TrpcContext {
  return {
    user: {
      id,
      openId: `family-router-${id}`,
      email,
      name: `Family User ${id}`,
      loginMethod: "demo",
      role: "owner",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };
}

describe("tRPC familyRouter", () => {
  let credentialsValid = false;
  let ownerAnimalId = 1;
  const ownerCtx = createMockContext(1, "demo@animalmind.local");
  const memberCtx = createMockContext(2, "family-member@animalmind.local");
  const ownerCaller = appRouter.createCaller(ownerCtx);
  const memberCaller = appRouter.createCaller(memberCtx);

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

      let { data: member } = await supabase
        .from("users")
        .select("id")
        .eq("email", memberCtx.user.email)
        .single();
      if (!member) {
        const { data: inserted, error } = await supabase
          .from("users")
          .insert([
            {
              open_id: "family-router-member",
              name: "Family Member",
              email: memberCtx.user.email,
              login_method: "demo",
              role: "owner",
              last_signed_in: new Date().toISOString(),
            },
          ])
          .select()
          .single();
        if (error) throw error;
        member = inserted;
      }
      memberCtx.user.id = Number(member.id);

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

  it("creates a family, generates invite and lets a member join", async () => {
    const family = await ownerCaller.family.create({ name: "Família Teste" });
    expect(family.name).toBe("Família Teste");

    const invite = await ownerCaller.family.createInvite({ familyId: family.id });
    expect(invite.code).toHaveLength(6);
    expect(invite.inviteUrl).toContain(`/join/${invite.code}`);

    const joined = await memberCaller.family.join({ code: invite.code });
    expect(joined).toEqual({ success: true, familyId: family.id });

    const members = await ownerCaller.family.getMembers();
    expect(members.some((member) => member.userId === memberCtx.user.id)).toBe(true);
  });

  it("shares an animal with the family and lists shared animals", async () => {
    if (!credentialsValid) return;

    const family = await ownerCaller.family.create({ name: "Família Animal" });
    const result = await ownerCaller.family.shareAnimal({
      familyId: family.id,
      animalId: ownerAnimalId,
    });
    expect(result).toEqual({ success: true, familyId: family.id, animalId: ownerAnimalId });

    const animals = await ownerCaller.family.getAnimals();
    expect(animals.some((animal) => Number(animal.id) === ownerAnimalId)).toBe(true);
  });

  afterAll(() => {
    if (fs.existsSync(FAMILIES_FILE_PATH)) fs.unlinkSync(FAMILIES_FILE_PATH);
  });
});
