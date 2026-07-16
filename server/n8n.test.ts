import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createN8NSignature, notifyN8N } from "./_core/notification";

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
    process.env.N8N_WEBHOOK_SECRET = "test-secret";
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await notifyN8N({
      userId: 1,
      animalId: 1,
      animalName: "Bobi",
      emotionalState: "distress",
      confidence: 0.9,
      timestamp: "2026-06-02T17:00:00.000Z",
    });

    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("skips webhook request when N8N_WEBHOOK_SECRET is not set", async () => {
    process.env.N8N_WEBHOOK_URL = "https://n8n.example.com/webhook/test";
    delete process.env.N8N_WEBHOOK_SECRET;
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await notifyN8N({
      userId: 1,
      animalId: 1,
      animalName: "Bobi",
      emotionalState: "relaxed",
      confidence: 0.91,
      timestamp: "2026-06-02T17:00:00.000Z",
    });

    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("makes a signed POST request to N8N_WEBHOOK_URL with the classification payload", async () => {
    process.env.N8N_WEBHOOK_URL = "https://n8n.example.com/webhook/test";
    process.env.N8N_WEBHOOK_SECRET = "test-secret";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "OK",
    });
    vi.stubGlobal("fetch", fetchMock);

    const payload = {
      userId: 1,
      animalId: 1,
      animalName: "Bobi",
      emotionalState: "distress",
      confidence: 0.9,
      timestamp: "2026-06-02T17:00:00.000Z",
    };

    const result = await notifyN8N(payload);

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe("https://n8n.example.com/webhook/test");
    expect(calledInit.method).toBe("POST");
    expect(calledInit.headers["Content-Type"]).toBe("application/json");
    expect(calledInit.headers["X-AnimalMind-Signature"]).toBe(
      createN8NSignature(calledInit.body, "test-secret"),
    );

    const body = JSON.parse(calledInit.body);
    expect(body.userId).toBe(1);
    expect(body.animalId).toBe(1);
    expect(body.animalName).toBe("Bobi");
    expect(body.emotionalState).toBe("distress");
    expect(body.confidence).toBe(0.9);
    expect(body.timestamp).toBe("2026-06-02T17:00:00.000Z");
  });

  it("creates HMAC-SHA256 signatures with sha256 prefix", () => {
    const body = JSON.stringify({ hello: "animalmind" });
    const expected = `sha256=${createHmac("sha256", "secret").update(body).digest("hex")}`;

    expect(createN8NSignature(body, "secret")).toBe(expected);
  });
});
