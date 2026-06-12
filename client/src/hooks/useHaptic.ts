import { useCallback } from "react";

export function useHaptic() {
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        console.warn("[Haptic] Vibration failed/blocked:", e);
      }
    }
  }, []);

  const triggerStartRecording = useCallback(() => vibrate(50), [vibrate]);
  const triggerStopRecording = useCallback(() => vibrate([50, 50, 50]), [vibrate]);
  const triggerSaveSuccess = useCallback(() => vibrate(30), [vibrate]);
  const triggerCriticalError = useCallback(() => vibrate(200), [vibrate]);

  return {
    vibrate,
    triggerStartRecording,
    triggerStopRecording,
    triggerSaveSuccess,
    triggerCriticalError,
  };
}
