import admin from "firebase-admin";

let initialized = false;

export function initFCM() {
  if (initialized) return;

  const credJson = process.env.FIREBASE_CREDENTIALS_JSON;
  if (!credJson) {
    console.warn("[FCM] FIREBASE_CREDENTIALS_JSON not found. Push notifications are disabled.");
    return;
  }

  try {
    const cred = JSON.parse(credJson);
    admin.initializeApp({
      credential: admin.credential.cert(cred),
    });
    initialized = true;
    console.log("[FCM] Firebase Admin initialized successfully.");
  } catch (error) {
    console.error("[FCM] Error initializing Firebase Admin:", error);
  }
}

export async function sendPushNotification(token: string, title: string, body: string, data?: Record<string, string>) {
  if (!initialized) {
    console.warn("[FCM] Cannot send notification. Firebase Admin not initialized.");
    return false;
  }

  try {
    const message: admin.messaging.Message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token,
    };

    const response = await admin.messaging().send(message);
    console.log(`[FCM] Successfully sent message: ${response}`);
    return true;
  } catch (error) {
    console.error(`[FCM] Error sending message:`, error);
    return false;
  }
}
