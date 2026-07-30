import os
import json
import firebase_admin
from firebase_admin import credentials, messaging

_fcm_initialized = False

def init_fcm():
    global _fcm_initialized
    if _fcm_initialized:
        return
    
    cred_json = os.environ.get("FIREBASE_CREDENTIALS_JSON")
    if cred_json:
        try:
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            _fcm_initialized = True
            print("[FCM] Firebase Admin initialized successfully.")
        except Exception as e:
            print(f"[FCM] Failed to initialize Firebase Admin: {e}")
    else:
        print("[FCM] FIREBASE_CREDENTIALS_JSON not found. Push notifications disabled.")

async def send_push_notification_async(token: str, title: str, body: str, data: dict = None):
    if not _fcm_initialized:
        return False
    
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            token=token,
        )
        # Using a thread pool or simple blocking call since firebase-admin send is blocking
        # but for our scale, synchronous inside async is ok or we can use asyncio.to_thread
        import asyncio
        response = await asyncio.to_thread(messaging.send, message)
        print(f"[FCM] Successfully sent message: {response}")
        return True
    except Exception as e:
        print(f"[FCM] Error sending message: {e}")
        return False
