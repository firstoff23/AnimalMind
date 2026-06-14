/**
 * Self-healing module unit tests
 *
 * Tests the error classification, pattern detection, and retry logic
 * in isolation (no network calls, no React DOM).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { withAutoRetry } from "../hooks/useAppHealing";

describe("withAutoRetry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("resolves on the first attempt if no error", async () => {
    const fn = vi.fn().mockResolvedValue(42);
    const result = await withAutoRetry(fn, { baseDelayMs: 0 });
    expect(result).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries and resolves on the second attempt", async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls < 2) throw new Error("transient");
      return "ok";
    });

    const result = await withAutoRetry(fn, { maxAttempts: 3, baseDelayMs: 0 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting all retries", async () => {
    const fn = vi.fn().mockImplementation(async () => {
      throw new Error("permanent failure");
    });

    await expect(
      withAutoRetry(fn, { maxAttempts: 3, baseDelayMs: 0 }),
    ).rejects.toThrow("permanent failure");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
