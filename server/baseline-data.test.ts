import { describe, expect, it } from "vitest";
import { buildBehaviorBaselineFromEvents } from "./db";

describe("behavior baseline calculation", () => {
  it("calculates a four-week state distribution without overwriting manual settings", () => {
    const baseline = buildBehaviorBaselineFromEvents(
      [
        { state: "relaxed" },
        { state: "relaxed" },
        { state: "attention" },
        { state: "hunger" },
      ],
      {
        vocalizationThreshold: 14,
        normalStates: ["relaxed"],
        alertSensitivity: "high",
      },
      "2026-04-27T00:00:00.000Z",
      "2026-05-25T00:00:00.000Z",
    );

    expect(baseline.vocalizationThreshold).toBe(14);
    expect(baseline.normalStates).toEqual(["relaxed"]);
    expect(baseline.alertSensitivity).toBe("high");
    expect(baseline.sampleSize).toBe(4);
    expect(baseline.stateDistribution).toMatchObject({
      relaxed: 0.5,
      attention: 0.25,
      hunger: 0.25,
    });
    expect(baseline.typicalStates).toEqual(["relaxed", "hunger", "attention"]);
    expect(baseline.calculatedFrom).toBe("2026-04-27T00:00:00.000Z");
    expect(baseline.calculatedTo).toBe("2026-05-25T00:00:00.000Z");
  });
});
