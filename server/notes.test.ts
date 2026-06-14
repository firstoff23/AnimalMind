import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

// Mock Supabase client
vi.mock("@supabase/supabase-js", () => {
  const mockNotes: Record<number, string> = {};

  return {
    createClient: vi.fn().mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        let eqId: any = null;
        let updateNotes: string | null = null;

        const builder: any = {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockImplementation((data: any) => {
            if (data && data.notes !== undefined) {
              updateNotes = data.notes;
            }
            return builder;
          }),
          eq: vi.fn().mockImplementation((col: string, val: any) => {
            if (col === "id") {
              eqId = val;
            }
            return builder;
          }),
          single: vi.fn().mockImplementation(() => {
            if (table === "classification_events") {
              return Promise.resolve({
                data: { notes: mockNotes[eqId] ?? "" },
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
          then: vi.fn().mockImplementation((onfulfilled) => {
            if (updateNotes !== null && eqId !== null) {
              mockNotes[eqId] = updateNotes;
            }
            return Promise.resolve({ error: null }).then(onfulfilled);
          }),
        };
        return builder;
      }),
    }),
  };
});

function createMockContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "demo-user-001",
      email: "demo@animalmind.local",
      name: "Demo User",
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

describe("events.notes", () => {
  const ctx = createMockContext();
  const caller = appRouter.createCaller(ctx);
  const testEventId = 99999;
  const testNote = "Nota de teste do vitest";

  it("can write a note for an event and retrieve it", async () => {
    // 1. Update notes
    const updateResult = await caller.events.updateNotes({
      eventId: testEventId,
      notes: testNote,
    });
    expect(updateResult).toEqual({ success: true, notes: testNote });

    // 2. Read notes
    const getResult = await caller.events.getNotes({ eventId: testEventId });
    expect(getResult).toBe(testNote);
  });

  it("returns empty string for non-existent event note", async () => {
    const getResult = await caller.events.getNotes({ eventId: 888888 });
    expect(getResult).toBe("");
  });
});
