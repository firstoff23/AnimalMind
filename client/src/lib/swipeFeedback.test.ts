import { describe, expect, it } from "vitest";
import { clampSwipeOffset, resolveSwipeFeedback } from "./swipeFeedback";

describe("swipeFeedback", () => {
  it("resolves a right swipe as correct feedback", () => {
    expect(resolveSwipeFeedback(82)).toBe("correct");
  });

  it("resolves a left swipe as incorrect feedback", () => {
    expect(resolveSwipeFeedback(-82)).toBe("incorrect");
  });

  it("ignores short swipes", () => {
    expect(resolveSwipeFeedback(32)).toBeNull();
    expect(resolveSwipeFeedback(-32)).toBeNull();
  });

  it("clamps visual offset to stable row bounds", () => {
    expect(clampSwipeOffset(160)).toBe(96);
    expect(clampSwipeOffset(-160)).toBe(-96);
    expect(clampSwipeOffset(24)).toBe(24);
  });
});
