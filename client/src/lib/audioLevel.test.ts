import { describe, expect, it } from "vitest";
import { calculateAudioLevel, createWaveform } from "./audioLevel";

describe("audioLevel", () => {
  it("returns no level for silence", () => {
    expect(calculateAudioLevel(new Uint8Array([128, 128, 128, 128]))).toBe(0);
  });

  it("normalizes waveform amplitude into a 0 to 1 level", () => {
    expect(calculateAudioLevel(new Uint8Array([0, 128, 255, 128]))).toBeGreaterThanOrEqual(0.7);
    expect(calculateAudioLevel(new Uint8Array([0, 128, 255, 128]))).toBeLessThanOrEqual(1);
  });

  it("creates compact waveform buckets from raw samples", () => {
    expect(createWaveform(new Uint8Array([128, 128, 0, 255, 128, 160, 96, 128]), 4)).toEqual([
      0,
      1,
      0.25,
      0.25,
    ]);
  });
});
