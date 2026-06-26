import type pino from "pino";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: "default";
}

interface ExpoPushTicket {
  status: "ok" | "error";
  message?: string;
  details?: unknown;
}

interface ExpoPushResponse {
  data?: ExpoPushTicket[];
  errors?: { code: string; message: string }[];
}

export async function sendExpoPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  logger?: pino.Logger,
): Promise<void> {
  const validTokens = tokens.filter(
    (t) => t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken["),
  );
  if (validTokens.length === 0) return;

  const messages: PushMessage[] = validTokens.map((to) => ({
    to,
    title,
    body,
    data,
    sound: "default",
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      logger?.warn({ status: res.status }, "push: Expo push API non-200");
      return;
    }

    const json = (await res.json()) as ExpoPushResponse;
    if (json.errors?.length) {
      logger?.warn({ errors: json.errors }, "push: Expo push API returned errors");
    }
  } catch (err) {
    logger?.warn({ err }, "push: failed to reach Expo push API");
  }
}
