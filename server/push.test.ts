import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { getSupabase } from "./db";
import { appRouter } from "./routers";

// Mock DB module
vi.mock("./db", () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  };

  return {
    getSupabase: vi.fn().mockReturnValue(mockSupabase),
    getDemoUserId: vi.fn().mockResolvedValue(1),
  };
});

const dummyUser = {
  id: 1,
  openId: "demo-user-001",
  email: "demo@animalmind.local",
  name: "Demo User",
  loginMethod: "demo",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function makeCtx(user: TrpcContext["user"] = dummyUser): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("pushRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("subscribe", () => {
    it("allows authenticated user to subscribe", async () => {
      const caller = appRouter.createCaller(makeCtx());
      const payload = {
        endpoint: "https://updates.push.services.mozilla.com/wpush/v2/gAAAAA",
        keys: {
          p256dh: "BEl62iCwtwSTqj5...",
          auth: "mTBP5...",
        },
      };

      const result = await caller.push.subscribe(payload);
      expect(result).toEqual({ success: true });

      const supabase = getSupabase();
      expect(supabase.from).toHaveBeenCalledWith("push_subscriptions");
      expect(supabase.upsert).toHaveBeenCalledWith(
        {
          user_id: 1,
          endpoint: payload.endpoint,
          p256dh: payload.keys.p256dh,
          auth: payload.keys.auth,
        },
        {
          onConflict: "endpoint",
        },
      );
    });

    it("denies subscription for unauthenticated user", async () => {
      const caller = appRouter.createCaller(makeCtx(null));
      const payload = {
        endpoint: "https://updates.push.services.mozilla.com/wpush/v2/gAAAAA",
        keys: {
          p256dh: "BEl62iCwtwSTqj5...",
          auth: "mTBP5...",
        },
      };

      await expect(caller.push.subscribe(payload)).rejects.toThrow();
    });
  });

  describe("unsubscribe", () => {
    it("allows user to unsubscribe", async () => {
      const caller = appRouter.createCaller(makeCtx());
      const payload = {
        endpoint: "https://updates.push.services.mozilla.com/wpush/v2/gAAAAA",
      };

      const result = await caller.push.unsubscribe(payload);
      expect(result).toEqual({ success: true });

      const supabase = getSupabase();
      expect(supabase.from).toHaveBeenCalledWith("push_subscriptions");
      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith("endpoint", payload.endpoint);
      expect(supabase.eq).toHaveBeenCalledWith("user_id", 1);
    });
  });
});
