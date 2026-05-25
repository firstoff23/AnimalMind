import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SUPABASE_URL = "https://animalmind.supabase.co";
const SUPABASE_KEY = "service-role-key";

async function loadDbWithClient(client: unknown) {
  vi.resetModules();
  vi.doMock("@supabase/supabase-js", () => ({
    createClient: vi.fn(() => client),
  }));

  process.env.SUPABASE_URL = SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = SUPABASE_KEY;

  return import("./db");
}

describe("audio storage persistence", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SUPABASE_KEY;
  });

  afterEach(() => {
    vi.doUnmock("@supabase/supabase-js");
    vi.restoreAllMocks();
  });

  it("uploads recorded audio to the audio-recordings bucket", async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: "events/1/test.webm" }, error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: {
        publicUrl:
          "https://animalmind.supabase.co/storage/v1/object/public/audio-recordings/events/1/test.webm",
      },
    });
    const from = vi.fn(() => ({ upload, getPublicUrl }));
    const createBucket = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = { storage: { createBucket, from } };

    const { uploadAudioToSupabase } = await loadDbWithClient(client);
    const buffer = Buffer.from("audio-bytes");

    const url = await uploadAudioToSupabase("events/1/test.webm", buffer, "audio/webm");

    expect(createBucket).toHaveBeenCalledWith(
      "audio-recordings",
      expect.objectContaining({
        public: true,
        allowedMimeTypes: expect.arrayContaining(["audio/webm", "audio/wav"]),
      }),
    );
    expect(from).toHaveBeenCalledWith("audio-recordings");
    expect(upload).toHaveBeenCalledWith("events/1/test.webm", buffer, {
      contentType: "audio/webm",
      upsert: false,
    });
    expect(url).toContain("/audio-recordings/events/1/test.webm");
  });

  it("stores the uploaded audio URL on classification_events.audio_url", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    const client = { from };
    const audioUrl =
      "https://animalmind.supabase.co/storage/v1/object/public/audio-recordings/events/42/test.wav";

    const { updateEventAudio } = await loadDbWithClient(client);

    await expect(updateEventAudio(42, audioUrl)).resolves.toBe(audioUrl);
    expect(from).toHaveBeenCalledWith("classification_events");
    expect(update).toHaveBeenCalledWith({ audio_url: audioUrl });
    expect(eq).toHaveBeenCalledWith("id", 42);
  });

  it("reads the uploaded audio URL from classification_events.audio_url", async () => {
    const audioUrl =
      "https://animalmind.supabase.co/storage/v1/object/public/audio-recordings/events/42/test.wav";
    const single = vi.fn().mockResolvedValue({ data: { audio_url: audioUrl }, error: null });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const client = { from };

    const { getEventAudio } = await loadDbWithClient(client);

    await expect(getEventAudio(42)).resolves.toBe(audioUrl);
    expect(from).toHaveBeenCalledWith("classification_events");
    expect(select).toHaveBeenCalledWith("audio_url");
    expect(eq).toHaveBeenCalledWith("id", 42);
  });

  it("does not include audio_url on initial inserts without an uploaded URL", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 42 }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));
    const client = { from };

    const { insertEvent } = await loadDbWithClient(client);

    await insertEvent({
      userId: 1,
      animalId: 2,
      state: "relaxed",
      confidence: 0.91,
      emoji: "⚪",
      modelUsed: "yamnet",
    });

    const inserted = insert.mock.calls[0][0][0];
    expect("audio_url" in inserted).toBe(false);
  });
});
