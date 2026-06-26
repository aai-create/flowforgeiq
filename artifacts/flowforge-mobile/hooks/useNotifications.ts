import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

async function registerTokenWithServer(token: string, bearerToken: string): Promise<void> {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) return;
  try {
    await fetch(`https://${domain}/api/push-tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({ expoPushToken: token }),
    });
  } catch {
    // best-effort
  }
}

type NotifData = {
  type?: string;
  shipmentId?: number | null;
  messageId?: number | null;
};

function navigateFromNotifData(router: ReturnType<typeof useRouter>, data: NotifData) {
  const { type, shipmentId } = data;

  if (type === "stage-change") {
    if (shipmentId) {
      router.push({
        pathname: "/(tabs)/chat" as any,
        params: { preSelectedShipmentId: String(shipmentId) },
      });
    } else {
      router.push({ pathname: "/(tabs)/home" as any });
    }
  } else if (type === "message" || type === "message-routed") {
    if (shipmentId) {
      router.push({
        pathname: "/(tabs)/chat" as any,
        params: { preSelectedShipmentId: String(shipmentId) },
      });
    } else {
      router.push({ pathname: "/(tabs)/home" as any });
    }
  }
}

export function useNotifications() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const coldStartHandled = useRef(false);

  useEffect(() => {
    if (!isSignedIn || Platform.OS === "web") return;

    let cancelled = false;

    (async () => {
      const expoPushToken = await registerForPushNotificationsAsync();
      if (!expoPushToken || cancelled) return;

      const bearer = await getToken();
      if (!bearer || cancelled) return;

      await registerTokenWithServer(expoPushToken, bearer);
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    if (!coldStartHandled.current) {
      coldStartHandled.current = true;
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!response) return;
        const data = response.notification.request.content.data as NotifData;
        navigateFromNotifData(router, data);
      }).catch(() => {});
    }

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as NotifData;
        navigateFromNotifData(router, data);
      },
    );

    return () => {
      responseListener.current?.remove();
    };
  }, [router]);
}
