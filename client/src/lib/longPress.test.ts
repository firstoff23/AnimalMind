import { describe, expect, it } from "vitest";
import {
  LONG_PRESS_DELAY_MS,
  LONG_PRESS_MOVE_TOLERANCE,
  isLongPressDuration,
  isLongPressMovementAllowed,
  shouldOpenLongPressDetails,
} from "./longPress";

describe("long press helpers", () => {
  it("accepts presses at or above the minimum duration", () => {
    expect(isLongPressDuration(LONG_PRESS_DELAY_MS)).toBe(true);
    expect(isLongPressDuration(LONG_PRESS_DELAY_MS + 120)).toBe(true);
  });

  it("rejects presses below the minimum duration", () => {
    expect(isLongPressDuration(LONG_PRESS_DELAY_MS - 1)).toBe(false);
  });

  it("allows small pointer movement during a long press", () => {
    expect(isLongPressMovementAllowed(4, 8)).toBe(true);
    expect(isLongPressMovementAllowed(LONG_PRESS_MOVE_TOLERANCE, 0)).toBe(true);
  });

  it("rejects long press when pointer movement is too large", () => {
    expect(isLongPressMovementAllowed(LONG_PRESS_MOVE_TOLERANCE + 1, 0)).toBe(
      false,
    );
    expect(shouldOpenLongPressDetails(LONG_PRESS_DELAY_MS + 40, 14, 0)).toBe(
      false,
    );
  });

  it("opens raw details only for a long enough stable press", () => {
    expect(shouldOpenLongPressDetails(LONG_PRESS_DELAY_MS + 40, 2, 3)).toBe(
      true,
    );
    expect(shouldOpenLongPressDetails(LONG_PRESS_DELAY_MS - 40, 0, 0)).toBe(
      false,
    );
  });
});
