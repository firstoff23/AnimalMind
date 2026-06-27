import webpush from "web-push";
import { initializeApp, cert } from "firebase-admin/app";
import type { App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { getSupabase } from "../db";

const email = "mailto:suporte@pawra.app";
const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  webpush.setVapidDetails(email, publicKey, privateKey);
} else {
  console.warn("[Push] VAPID keys are not fully configured in environment variables.");
}

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, any>;
};

let firebaseAdminApp: App | null = null;

function getFirebaseAdmin() {
  if (firebaseAdminApp) return firebaseAdminApp;
  
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  
  try {
    if (serviceAccountJson) {
      const credentials = JSON.parse(serviceAccountJson);
      firebaseAdminApp = initializeApp({
        credential: cert(credentials)
      }, "pawra-fcm");
      console.log("[Push] Firebase Admin SDK initialized via JSON string.");
    } else if (serviceAccountPath) {
      firebaseAdminApp = initializeApp({
        credential: cert(serviceAccountPath)
      }, "pawra-fcm");
      console.log(`[Push] Firebase Admin SDK initialized via path: ${serviceAccountPath}`);
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseAdminApp = initializeApp(undefined, "pawra-fcm");
      console.log("[Push] Firebase Admin SDK initialized via GOOGLE_APPLICATION_CREDENTIALS.");
    }
  } catch (err) {
    console.warn("[Push] Firebase Admin SDK failed to initialize. Native push notifications via SDK will not be sent.", err);
  }
  return firebaseAdminApp;
}

async function sendNativeFcmNotification(token: string, payload: PushPayload) {
  const adminApp = getFirebaseAdmin();
  if (adminApp) {
    try {
      const messaging = getMessaging(adminApp);
      await messaging.send({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data ? Object.fromEntries(
          Object.entries(payload.data).map(([k, v]) => [k, String(v)])
        ) : undefined,
      });
      console.log(`[Push] Successfully sent FCM native notification to ${token} via SDK.`);
      return;
    } catch (sdkErr: any) {
      console.error("[Push] Error sending native FCM via SDK, checking legacy fallback:", sdkErr.message);
    }
  }
  
  const serverKey = process.env.FCM_SERVER_KEY;
  if (serverKey) {
    const response = await globalThis.fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `key=${serverKey}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FCM Legacy HTTP error: ${response.status} - ${errorText}`);
    }
    console.log(`[Push] Successfully sent FCM native notification to ${token} via Legacy API.`);
    return;
  }
  
  throw new Error("Neither Firebase Admin SDK nor FCM_SERVER_KEY is configured on the server.");
}

/**
 * Sends a push notification to all active subscriptions of a given user.
 * Automatically cleans up subscriptions that return 404 (Not Found) or 410 (Gone).
 */
export async function sendPushNotification(
  userId: number,
  payload: PushPayload,
): Promise<{ successCount: number; failureCount: number }> {
  const supabase = getSupabase();

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error(`[Push] Error fetching subscriptions for user ${userId}:`, error);
    return { successCount: 0, failureCount: 0 };
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log(`[Push] No push subscriptions found for user ${userId}.`);
    return { successCount: 0, failureCount: 0 };
  }

  let successCount = 0;
  let failureCount = 0;

  const payloadString = JSON.stringify({
    notification: {
      title: payload.title,
      body: payload.body,
      data: payload.data,
    },
  });

  const sendPromises = subscriptions.map(async (sub) => {
    if (sub.p256dh === "native-fcm") {
      const token = sub.endpoint.split("/").pop();
      if (!token) {
        console.error(`[Push] Invalid FCM token endpoint for subscription ID ${sub.id}: ${sub.endpoint}`);
        failureCount++;
        return;
      }
      
      try {
        await sendNativeFcmNotification(token, payload);
        successCount++;
      } catch (err: any) {
        console.error(`[Push] Error sending native FCM to token ${token}:`, err.message);
        failureCount++;

        // Clean up expired or invalid subscriptions
        if (
          err.statusCode === 410 || 
          err.statusCode === 404 || 
          err.message?.includes("messaging/registration-token-not-registered") ||
          err.message?.includes("404") ||
          err.message?.includes("410")
        ) {
          console.log(`[Push] Deleting expired native subscription for user ${userId} (token: ${token})`);
          const { error: deleteError } = await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);

          if (deleteError) {
            console.error(`[Push] Failed to delete expired native subscription ${sub.id}:`, deleteError);
          }
        }
      }
      return;
    }

    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, payloadString);
      successCount++;
    } catch (err: any) {
      console.error(`[Push] Error sending to endpoint ${sub.endpoint}:`, err.message);
      failureCount++;

      // Clean up expired or invalid subscriptions
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.log(`[Push] Deleting expired subscription for user ${userId} (endpoint: ${sub.endpoint})`);
        const { error: deleteError } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id);

        if (deleteError) {
          console.error(`[Push] Failed to delete expired subscription ${sub.id}:`, deleteError);
        }
      }
    }
  });

  await Promise.all(sendPromises);

  return { successCount, failureCount };
}
