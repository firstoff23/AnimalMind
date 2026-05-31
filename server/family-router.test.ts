import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("@supabase/supabase-js", () => {
  const families: any[] = [];
  const family_members: any[] = [];
  const invites: any[] = [];
  const family_animals: any[] = [];
  const users: any[] = [
    { id: 1, email: "demo@animalmind.local", name: "Demo User" },
    { id: 2, email: "family-member@animalmind.local", name: "Family Member" }
  ];

  return {
    createClient: vi.fn().mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        const eqConditions: Record<string, any> = {};
        let lastEqColumn: string | null = null;
        let lastEqValue: any = null;
        let lastInValue: any = null;
        let lastInsertData: any = null;

        const builder: any = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockImplementation((data: any) => {
            const arr = Array.isArray(data) ? data : [data];
            for (const item of arr) {
              const id = Math.floor(Math.random() * 1000000) + 1;
              const newItem = { id, created_at: new Date().toISOString(), ...item };
              if (table === "families") families.push(newItem);
              if (table === "family_members") family_members.push(newItem);
              if (table === "invites") invites.push(newItem);
              if (table === "family_animals") family_animals.push(newItem);
              lastInsertData = newItem;
            }
            return builder;
          }),
          update: vi.fn().mockImplementation((data: any) => {
            let targetList: any[] = [];
            if (table === "invites") targetList = invites;
            for (const item of targetList) {
              const codeCond = eqConditions["code"];
              if (codeCond && item.code === codeCond) {
                Object.assign(item, data);
              } else if (lastEqColumn && item[lastEqColumn] === lastEqValue) {
                Object.assign(item, data);
              }
            }
            return builder;
          }),
          upsert: vi.fn().mockImplementation((data: any) => {
            const arr = Array.isArray(data) ? data : [data];
            let targetList: any[] = [];
            if (table === "family_members") targetList = family_members;
            if (table === "family_animals") targetList = family_animals;
            for (const item of arr) {
              const match = targetList.find(x => 
                x.family_id === item.family_id && 
                ((item.user_id !== undefined && x.user_id === item.user_id) || 
                 (item.animal_id !== undefined && x.animal_id === item.animal_id))
              );
              if (match) {
                Object.assign(match, item);
              } else {
                targetList.push({ id: Math.floor(Math.random() * 1000000) + 1, ...item });
              }
            }
            return builder;
          }),
          eq: vi.fn().mockImplementation((col: string, val: any) => {
            eqConditions[col] = val;
            lastEqColumn = col;
            lastEqValue = val;
            return builder;
          }),
          in: vi.fn().mockImplementation((col: string, val: any) => {
            lastInValue = val;
            return builder;
          }),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockImplementation(() => {
            return builder;
          }),
          single: vi.fn().mockImplementation(() => {
            let data: any = null;
            if (table === "families" && lastInsertData) {
              data = lastInsertData;
            } else if (table === "users") {
              const emailCond = eqConditions["email"];
              const idCond = eqConditions["id"];
              const openIdCond = eqConditions["open_id"];
              data = users.find(u => 
                (emailCond && u.email === emailCond) || 
                (idCond && u.id === idCond) ||
                (openIdCond && u.openId === openIdCond)
              );
              if (!data) data = { id: 1, email: "demo@animalmind.local", name: "Demo User" };
            } else if (table === "animals") {
              data = { id: 1, user_id: 1, name: "Bobi", species: "dog" };
            } else if (table === "invites") {
              const codeCond = eqConditions["code"];
              if (codeCond) {
                data = invites.find(i => i.code === codeCond);
              } else {
                data = invites.find(i => i.code === lastEqValue) || lastInsertData;
              }
            }
            return Promise.resolve({ data, error: data ? null : { code: "PGRST116", message: "Not found" } });
          }),
          then: vi.fn().mockImplementation((resolve) => {
            let data: any = [];
            if (table === "family_members") {
              if (lastInValue) {
                data = family_members.filter(m => lastInValue.includes(Number(m.family_id)));
              } else if (eqConditions["user_id"]) {
                data = family_members.filter(m => Number(m.user_id) === Number(eqConditions["user_id"]));
              } else {
                data = family_members;
              }
            } else if (table === "family_animals") {
              if (lastInValue) {
                data = family_animals.filter(a => lastInValue.includes(a.family_id));
              } else {
                data = family_animals;
              }
            } else if (table === "animals") {
              data = [{ id: 1, name: "Bobi", species: "dog", user_id: 1 }];
            }
            return Promise.resolve({ data, error: null }).then(resolve);
          })
        };
        return builder;
      }),
    }),
  };
});



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


});
