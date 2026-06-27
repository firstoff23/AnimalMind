import { Capacitor } from "@capacitor/core";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if the browser supports Push notifications and has permission.
 * Requests permission and registers subscription with backend via trpc mutation.
 */
export async function subscribeUserToPush(
  subscribeMutation: (variables: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }) => Promise<any>
) {
  if (Capacitor.isNativePlatform()) {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === "prompt") {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== "granted") {
        console.warn("[Push Setup] Native notification permission not granted.");
        return;
      }
      await PushNotifications.register();
      
      // Clear listeners before adding to avoid duplicates
      await PushNotifications.removeAllListeners();

      await PushNotifications.addListener("registration", async (token) => {
        console.log("[Push Setup] Native registration token:", token.value);
        const endpoint = `https://fcm.googleapis.com/fcm/send/${token.value}`;
        await subscribeMutation({
          endpoint,
          keys: {
            p256dh: "native-fcm",
            auth: "native-fcm",
          },
        });
      });

      await PushNotifications.addListener("registrationError", (err) => {
        console.error("[Push Setup] Native registration error:", err);
      });

      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("[Push Setup] Native notification received:", notification);
      });
    } catch (error) {
      console.error("[Push Setup] Failed to setup Capacitor push:", error);
    }
    return;
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("[Push Setup] Push notifications are not supported in this browser.");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check current permission state
    if (Notification.permission === "denied") {
      console.warn("[Push Setup] Notification permission is denied.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[Push Setup] Notification permission was not granted.");
      return;
    }

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      if (!VAPID_PUBLIC_KEY) {
        console.error("[Push Setup] VITE_VAPID_PUBLIC_KEY is not defined in client environment.");
        return;
      }

      const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
    }

    const subJSON = subscription.toJSON();
    if (subJSON.endpoint && subJSON.keys?.p256dh && subJSON.keys?.auth) {
      await subscribeMutation({
        endpoint: subJSON.endpoint,
        keys: {
          p256dh: subJSON.keys.p256dh,
          auth: subJSON.keys.auth,
        },
      });
      console.log("[Push Setup] Successfully registered push subscription with backend.");
    } else {
      console.error("[Push Setup] Push subscription is missing endpoint or keys.");
    }
  } catch (error) {
    console.error("[Push Setup] Failed to subscribe to push notifications:", error);
  }
}

/**
 * Unsubscribes from push notifications locally and calls trpc mutation to remove from backend.
 */
export async function unsubscribeUserFromPush(
  unsubscribeMutation: (variables: { endpoint: string }) => Promise<any>
) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await unsubscribeMutation({ endpoint });
      console.log("[Push Setup] Successfully unregistered push subscription.");
    }
  } catch (error) {
    console.error("[Push Setup] Failed to unsubscribe from push notifications:", error);
  }
}
