import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const FAMILY_SHARES_FILE_PATH = path.resolve(import.meta.dirname, "family_shares.json");

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn().mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        let lastEqColumn: string | null = null;
        let lastEqValue: any = null;
        const builder: any = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          upsert: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((col: string, val: any) => {
            lastEqColumn = col;
            lastEqValue = val;
            return builder;
          }),
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockImplementation(() => {
            if (table === "users") {
              if (lastEqValue === "partner@family.local" || lastEqValue === 2 || lastEqValue === "demo-user-002") {
                return Promise.resolve({ data: { id: 2, email: "partner@family.local", name: "Partner User" }, error: null });
              }
              return Promise.resolve({ data: { id: 1, email: "demo@animalmind.local", name: "Test User" }, error: null });
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

function createMockContext(userId: number, openId: string, email: string): TrpcContext {
  return {
    user: {
      id: userId,
      openId: openId,
      email: email,
      name: "Test User",
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

describe("tRPC Family Sharing / Multi-utilizador", () => {
  let credentialsValid = false;
  let ownerAnimalId = 1;
  
  // Owner user context (user ID 1)
  const ownerCtx = createMockContext(1, "demo-user-001", "demo@animalmind.local");
  const ownerCaller = appRouter.createCaller(ownerCtx);

  // Target user context (user ID 2)
  const targetCtx = createMockContext(2, "demo-user-002", "partner@family.local");
  const targetCaller = appRouter.createCaller(targetCtx);

  beforeAll(async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return;

    try {
      const supabase = createClient(url, key);
      const { data: selectOwner } = await supabase.from("users").select("id").eq("open_id", "demo-user-001").single();
      if (!selectOwner) {
        credentialsValid = false;
        return;
      }
      const ownerId = Number(selectOwner.id);
      ownerCtx.user.id = ownerId;

      // Upsert target user without explicit ID
      let { data: selectTarget } = await supabase.from("users").select("id").eq("open_id", "demo-user-002").single();
      if (!selectTarget) {
        const { data: insertData, error: insertErr } = await supabase.from("users").insert([
          {
            open_id: "demo-user-002",
            name: "Partner User",
            email: "partner@family.local",
            login_method: "demo",
            last_signed_in: new Date().toISOString(),
          }
        ]).select().single();
        if (insertErr) throw insertErr;
        selectTarget = insertData;
      }
      const targetId = Number(selectTarget.id);
      targetCtx.user.id = targetId;

      // Fetch animal owned by ownerId
      const { data: animals } = await supabase.from("animals").select("id").eq("user_id", ownerId).limit(1);
      if (animals && animals.length > 0) {
        ownerAnimalId = Number(animals[0].id);
        credentialsValid = true;
      }
    } catch (e) {
      console.error("beforeAll error in family.test.ts:", e);
      credentialsValid = false;
    }
  });

  it("can invite another user by email to share animal profile", async () => {
    if (!credentialsValid) return;

    const result = await ownerCaller.animals.inviteShare({
      animalId: ownerAnimalId,
      email: "partner@family.local",
      permission: "read",
    });

    expect(result).toHaveProperty("id");
    expect(result.status).toBe("pending");
    expect(result.permission).toBe("read");
  });

  it("target user can list pending invitations", async () => {
    if (!credentialsValid) return;

    const invitations = await targetCaller.animals.getPendingInvitations();
    expect(Array.isArray(invitations)).toBe(true);
    expect(invitations.length).toBeGreaterThan(0);
    expect(invitations[0].sharedWithEmail).toBe("partner@family.local");
  });

  it("target user can accept invitation", async () => {
    if (!credentialsValid) return;

    const invitations = await targetCaller.animals.getPendingInvitations();
    const inv = invitations[0];

    const response = await targetCaller.animals.respondToInvitation({
      invitationId: inv.id,
      action: "accept",
    });

    expect(response).toEqual({ success: true });

    // Verify animal is now shared
    const animals = await targetCaller.animals.list();
    const sharedIds = animals.map((a) => a.id);
    expect(sharedIds).toContain(ownerAnimalId);
  });

  it("owner can list and remove share relationships", async () => {
    if (!credentialsValid) return;

    const shares = await ownerCaller.animals.listShares({ animalId: ownerAnimalId });
    expect(Array.isArray(shares)).toBe(true);
    expect(shares.length).toBeGreaterThan(0);

    const share = shares[0];
    const deleteResult = await ownerCaller.animals.removeShare({
      shareId: share.id,
      animalId: ownerAnimalId,
    });

    expect(deleteResult).toEqual({ success: true });

    // Target caller should no longer see shared animal
    const targetAnimals = await targetCaller.animals.list();
    const sharedIds = targetAnimals.map((a) => a.id);
    expect(sharedIds).not.toContain(ownerAnimalId);
  });

  afterAll(() => {
    // Clean up temporary family shares
    try {
      if (fs.existsSync(FAMILY_SHARES_FILE_PATH)) {
        fs.unlinkSync(FAMILY_SHARES_FILE_PATH);
      }
    } catch (e) {
      console.error(e);
    }
  });
});
