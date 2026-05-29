export function triggerHaptic(type: "light" | "medium" | "heavy" | "success" | "error" | "warning" = "light") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    switch (type) {
      case "light":
        navigator.vibrate(10);
        break;
      case "medium":
        navigator.vibrate(20);
        break;
      case "heavy":
        navigator.vibrate(40);
        break;
      case "success":
        navigator.vibrate([15, 30, 15]);
        break;
      case "error":
        navigator.vibrate([50, 50, 50]);
        break;
      case "warning":
        navigator.vibrate([30, 50, 30]);
        break;
    }
  } catch (e) {
    console.warn("Haptic feedback not supported/blocked:", e);
  }
}
