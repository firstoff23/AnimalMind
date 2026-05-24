export type SwipeFeedback = "correct" | "incorrect";

export const SWIPE_FEEDBACK_THRESHOLD = 72;
export const SWIPE_VISUAL_LIMIT = 96;

export function resolveSwipeFeedback(offsetX: number): SwipeFeedback | null {
  if (offsetX >= SWIPE_FEEDBACK_THRESHOLD) return "correct";
  if (offsetX <= -SWIPE_FEEDBACK_THRESHOLD) return "incorrect";
  return null;
}

export function clampSwipeOffset(offsetX: number): number {
  return Math.max(-SWIPE_VISUAL_LIMIT, Math.min(SWIPE_VISUAL_LIMIT, offsetX));
}
