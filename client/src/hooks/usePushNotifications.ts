import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { FCM } from "@capacitor-community/fcm";
import { useAuth } from "../contexts/AuthContext";
import { trpc } from "@/lib/trpc";

export function usePushNotifications() {
  const { user } = useAuth();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const subscribeMutation = trpc.push.subscribe.useMutation();

  useEffect(() => {
    // Apenas corre em dispositivos móveis (Android/iOS)
    if (!Capacitor.isNativePlatform()) return;
    if (!user) return;

    let isMounted = true;

    const setupPush = async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === "prompt") {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== "granted") {
          console.warn("Utilizador recusou notificações push.");
          return;
        }

        await PushNotifications.register();

        PushNotifications.addListener("registration", (token) => {
          console.log("Push registration success (APNs/Native token):", token.value);
        });

        PushNotifications.addListener("registrationError", (error: any) => {
          console.error("Erro no registo Push: " + JSON.stringify(error));
        });

        // Ouvinte de eventos passivos - o utilizador clica na notificação
        PushNotifications.addListener("pushNotificationActionPerformed", (notification) => {
          console.log("Ação da notificação", notification.actionId, notification.inputValue);
        });

        // Extrair o token do Firebase Cloud Messaging para centralizar Push
        const { token } = await FCM.getToken();
        
        if (isMounted) {
          setFcmToken(token);
        }

        // Gravar o token na tabela push_subscriptions
        if (token) {
          try {
            await subscribeMutation.mutateAsync({
              endpoint: `https://fcm.googleapis.com/fcm/send/${token}`,
              keys: {
                p256dh: "native-fcm",
                auth: "native-fcm-auth",
              },
            });
            console.log("Token FCM registado com sucesso no backend.");
          } catch (err) {
            console.error("Erro ao enviar token FCM para o backend:", err);
          }
        }
      } catch (e) {
        console.error("Erro a inicializar notificações FCM:", e);
      }
    };

    setupPush();

    return () => {
      isMounted = false;
      // Idealmente, apenas removemos os listeners instanciados aqui
      PushNotifications.removeAllListeners();
    };
  }, [user]);

  return { fcmToken };
}
