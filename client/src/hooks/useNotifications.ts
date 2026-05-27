import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { EmotionalState } from "../../../shared/types";
import { STATE_LABELS } from "../../../shared/types";

// Anti-spam: track last notification time per animal
const lastNotifTime: Record<string, number> = {};
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const NOTIFICATION_PERMISSION_REQUESTED_KEY = "animalmind-notification-permission-requested";

export function useNotifications() {
  const permissionRef = useRef<NotificationPermission>(
    "Notification" in window ? Notification.permission : "default"
  );

  useEffect(() => {
    if ("Notification" in window) {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;

    permissionRef.current = Notification.permission;
    if (permissionRef.current === "granted") return true;
    if (permissionRef.current === "denied") return false;

    const alreadyRequested = localStorage.getItem(NOTIFICATION_PERMISSION_REQUESTED_KEY);
    if (alreadyRequested) return false;

    localStorage.setItem(NOTIFICATION_PERMISSION_REQUESTED_KEY, "true");
    const permission = await Notification.requestPermission();
    permissionRef.current = permission;
    return permission === "granted";
  }, []);

  const sendClassificationNotification = useCallback(
    (
      state: EmotionalState,
      confidence: number,
      animalName?: string,
      eventId?: number
    ) => {
      if (!("Notification" in window) || permissionRef.current !== "granted") {
        return false;
      }

      const label = STATE_LABELS[state];
      const title = animalName
        ? `AnimalMind — ${animalName}`
        : "AnimalMind — classificação concluída";
      const body = `${label}: ${Math.round(confidence * 100)}% de confiança`;

      try {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
          tag: eventId ? `classification-${eventId}` : "classification-latest",
        });
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const sendNotification = useCallback(
    (
      state: EmotionalState,
      confidence: number,
      animalName: string,
      animalId: string,
      sensitivity: "low" | "medium" | "high" = "medium",
      notificationsEnabled: boolean = true,
      includeBrowserNotification: boolean = true
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
      if (
        includeBrowserNotification &&
        "Notification" in window &&
        permissionRef.current === "granted"
      ) {
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

  return { requestNotificationPermission, sendClassificationNotification, sendNotification };
}
