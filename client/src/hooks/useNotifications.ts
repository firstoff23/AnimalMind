import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { EmotionalState } from "../../../shared/types";
import { STATE_LABELS } from "../../../shared/types";

// Anti-spam: track last notification time per animal
const lastNotifTime: Record<string, number> = {};
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

export function useNotifications() {
  const permissionRef = useRef<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      permissionRef.current = Notification.permission;
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          permissionRef.current = perm;
        });
      }
    }
  }, []);

  const sendNotification = useCallback(
    (
      state: EmotionalState,
      confidence: number,
      animalName: string,
      animalId: string,
      sensitivity: "low" | "medium" | "high" = "medium",
      notificationsEnabled: boolean = true
    ) => {
      // Respect global toggle
      if (!notificationsEnabled) return;

      // Thresholds per sensitivity
      const thresholds: Record<"low" | "medium" | "high", Record<string, number>> = {
        low:    { distress: 0.85, hunger: 0.80 },
        medium: { distress: 0.75, hunger: 0.70 },
        high:   { distress: 0.65, hunger: 0.60 },
      };

      const threshold = thresholds[sensitivity][state];
      if (!threshold || confidence < threshold) return;

      // Anti-spam: 1 notification per animal (any state) per 10 minutes
      const key = animalId; // keyed by animal only, not state
      const now = Date.now();
      if (lastNotifTime[key] && now - lastNotifTime[key] < COOLDOWN_MS) return;
      lastNotifTime[key] = now;

      const label = STATE_LABELS[state];
      const emoji = state === "distress" ? "🔴" : "🟠";
      const message = `${emoji} ${animalName} está a mostrar sinais de ${label.toLowerCase()} (${Math.round(confidence * 100)}% confiança)`;

      // In-app toast
      toast.warning(message, {
        duration: 6000,
        icon: emoji,
      });

      // Browser push notification
      if ("Notification" in window && permissionRef.current === "granted") {
        try {
          new Notification(`AnimalMind — ${animalName}`, {
            body: message,
            icon: "/favicon.ico",
            tag: key,
          });
        } catch {
          // Notification API not available in some contexts
        }
      }
    },
    []
  );

  return { sendNotification };
}
