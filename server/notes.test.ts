import { describe, expect, it, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import fs from "fs";
import path from "path";

const NOTES_FILE_PATH = path.resolve(import.meta.dirname, "notes.json");

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

  afterAll(() => {
    // Clean up test notes from notes.json
    try {
      if (fs.existsSync(NOTES_FILE_PATH)) {
        const content = fs.readFileSync(NOTES_FILE_PATH, "utf8");
        const notes = JSON.parse(content);
        delete notes[testEventId];
        fs.writeFileSync(NOTES_FILE_PATH, JSON.stringify(notes, null, 2), "utf8");
      }
    } catch (e) {
      console.error(e);
    }
  });
});
