import { describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { appRouter } from "./routers";

// Mock database module's getSupabase
const mockDeleteUser = vi.fn().mockResolvedValue({ error: null });
const mockDelete = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});
const mockSelect = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({
    data: [
      {
        audio_url:
          "https://yuzqxrmtbqlnalpjehno.supabase.co/storage/v1/object/public/audio-recordings/audio_1_2.webm",
      },
    ],
    error: null,
  }),
});
const mockRemove = vi.fn().mockResolvedValue({ error: null });

const mockSupabaseClient = {
  auth: {
    admin: {
      deleteUser: mockDeleteUser,
    },
  },
  from: (table: string) => {
    if (table === "classification_events") {
      return {
        select: mockSelect,
      };
    }
    return {
      delete: mockDelete,
    };
  },
  storage: {
    from: () => ({
      remove: mockRemove,
    }),
  },
};

vi.spyOn(db, "getSupabase").mockReturnValue(mockSupabaseClient as any);

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): {
  ctx: TrpcContext;
  clearedCookies: CookieCall[];
} {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user-openid",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.deleteAccount", () => {
  it("deletes user's files and auth user, removes DB row, and clears the session cookie", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.deleteAccount();

    expect(result).toEqual({ success: true });

    // Verify audio files removal
    expect(mockSelect).toHaveBeenCalledWith("audio_url");
    expect(mockRemove).toHaveBeenCalledWith(["audio_1_2.webm"]);

    // Verify Supabase Auth deletion
    expect(mockDeleteUser).toHaveBeenCalledWith("sample-user-openid");

    // Verify database row deletion
    expect(mockDelete).toHaveBeenCalled();

    // Verify cookie clearing
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});
