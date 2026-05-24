import { describe, expect, it, afterAll, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getEventAudio, updateEventAudio } from "./db";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const AUDIO_FILE_PATH = path.resolve(import.meta.dirname, "audio.json");

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

describe("audio.local-persistence", () => {
  const testEventId = 99999;
  const testAudioUrl = "https://supabase.co/storage/v1/object/public/animal-audio/test.webm";

  it("can write an audio mapping and retrieve it", async () => {
    // 1. Update audio
    await updateEventAudio(testEventId, testAudioUrl);

    // 2. Read audio
    const getResult = await getEventAudio(testEventId);
    expect(getResult).toBe(testAudioUrl);
  });

  it("returns empty string for non-existent event audio", async () => {
    const getResult = await getEventAudio(888888);
    expect(getResult).toBe("");
  });

  afterAll(() => {
    // Clean up test audio from audio.json
    try {
      if (fs.existsSync(AUDIO_FILE_PATH)) {
        const content = fs.readFileSync(AUDIO_FILE_PATH, "utf8");
        const audio = JSON.parse(content);
        delete audio[testEventId];
        fs.writeFileSync(AUDIO_FILE_PATH, JSON.stringify(audio, null, 2), "utf8");
      }
    } catch (e) {
      console.error(e);
    }
  });
});

describe("tRPC classify.run with audio", () => {
  const ctx = createMockContext();
  const caller = appRouter.createCaller(ctx);
  let credentialsValid = false;

  beforeAll(async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return;

    try {
      const supabase = createClient(url, key);
      const { error } = await supabase.from("users").select("id").limit(1);
      credentialsValid = !error;
    } catch {
      credentialsValid = false;
    }
  });

  it("accepts base64 audio and runs without crashing", async () => {
    if (!credentialsValid) return; // Skip gracefully if Supabase credentials are not valid (e.g. local dev without keys)
    
    const mockBase64Audio = "UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="; 
    
    const result = await caller.classify.run({
      animalId: 1,
      audio: mockBase64Audio,
      audioMimeType: "audio/wav",
    });

    expect(result).toHaveProperty("state");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("emoji");
    expect(result).toHaveProperty("eventId");
    expect(result).toHaveProperty("audioUrl");
  });
});
