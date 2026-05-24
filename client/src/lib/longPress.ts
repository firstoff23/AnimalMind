export const LONG_PRESS_DELAY_MS = 550;
export const LONG_PRESS_MOVE_TOLERANCE = 12;

export function isLongPressDuration(durationMs: number): boolean {
  return durationMs >= LONG_PRESS_DELAY_MS;
}

export function isLongPressMovementAllowed(
  deltaX: number,
  deltaY: number,
): boolean {
  return Math.hypot(deltaX, deltaY) <= LONG_PRESS_MOVE_TOLERANCE;
}

export function shouldOpenLongPressDetails(
  durationMs: number,
  deltaX: number,
  deltaY: number,
): boolean {
  return (
    isLongPressDuration(durationMs) &&
    isLongPressMovementAllowed(deltaX, deltaY)
  );
}
