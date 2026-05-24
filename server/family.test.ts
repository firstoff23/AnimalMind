import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const FAMILY_SHARES_FILE_PATH = path.resolve(import.meta.dirname, "family_shares.json");

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
      const { error } = await supabase.from("users").select("id").limit(1);
      credentialsValid = !error;
      
      if (credentialsValid) {
        // Ensure user 2 exists in Supabase (with email partner@family.local)
        await supabase.from("users").upsert([
          {
            id: 2,
            open_id: "demo-user-002",
            name: "Partner User",
            email: "partner@family.local",
            login_method: "demo",
            last_signed_in: new Date().toISOString(),
          }
        ]);

        const { data: animals } = await supabase.from("animals").select("id").eq("user_id", 1).limit(1);
        if (animals && animals.length > 0) {
          ownerAnimalId = animals[0].id;
        }
      }
    } catch {
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
