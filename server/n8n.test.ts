import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { notifyN8N } from "./_core/notification";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("n8n Webhook Notifications", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("skips webhook request when N8N_WEBHOOK_URL is not set", async () => {
    delete process.env.N8N_WEBHOOK_URL;
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await notifyN8N({
      animalName: "Bobi",
      species: "dog",
      breed: "Labrador",
      state: "distress",
      confidence: 0.9,
    });

    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("makes a POST request to N8N_WEBHOOK_URL with correct payload on critical state", async () => {
    process.env.N8N_WEBHOOK_URL = "https://n8n.example.com/webhook/test";
    
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "OK",
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload = {
      animalName: "Bobi",
      species: "dog",
      breed: "Labrador",
      state: "distress",
      confidence: 0.9,
      audioUrl: "https://example.com/audio.wav",
      posture: "alert",
    };

    const result = await notifyN8N(payload);

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe("https://n8n.example.com/webhook/test");
    expect(calledInit.method).toBe("POST");
    expect(calledInit.headers["Content-Type"]).toBe("application/json");
    
    const body = JSON.parse(calledInit.body);
    expect(body.event).toBe("critical_emotional_state");
    expect(body.animalName).toBe("Bobi");
    expect(body.state).toBe("distress");
    expect(body.confidence).toBe(0.9);
    expect(body.audioUrl).toBe("https://example.com/audio.wav");
    expect(body.posture).toBe("alert");
    expect(body).toHaveProperty("timestamp");
  });
});
