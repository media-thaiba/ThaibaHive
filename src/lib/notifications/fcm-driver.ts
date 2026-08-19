export interface FcmPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface FcmResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  unregistered?: boolean;
}

export async function sendFcmNotification(payload: FcmPayload): Promise<FcmResponse> {
  const fcmServerKey = process.env.FCM_SERVER_KEY;
  if (!fcmServerKey) {
    // Development / fallback mode when FCM key is not provisioned
    return {
      success: true,
      messageId: `fcm_mock_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    };
  }

  try {
    const res = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${fcmServerKey}`,
      },
      body: JSON.stringify({
        to: payload.token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        priority: "high",
      }),
    });

    if (res.status === 200) {
      const data = await res.json();
      if (data.failure > 0 && data.results?.[0]?.error === "NotRegistered") {
        return { success: false, unregistered: true, error: "NotRegistered" };
      }
      return { success: true, messageId: data.results?.[0]?.message_id || `fcm_${Date.now()}` };
    }

    return { success: false, error: `FCM Gateway Error: HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err.message || "FCM Network Dispatch Error" };
  }
}
