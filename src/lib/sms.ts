// SMS provider adapter supporting Philippine SMS gateways (Semaphore, PhilSMS,
// IPROG SMS, TextBee Android SIM Gateway) as well as a generic HTTP webhook
// and a local development mock. Provider credentials never leave this module (FR-018).

export type SendResult =
  | { kind: "accepted"; providerMessageId: string } // provider took it; delivery receipt may follow
  | { kind: "delivered"; providerMessageId: string }
  | { kind: "temporary_failure"; reason: string }
  | { kind: "permanent_failure"; reason: string }
  | { kind: "ambiguous"; reason: string }; // timeout / unknown outcome: do not auto-retry

const TIMEOUT_MS = 12_000;

export type SmsProviderType =
  | "mock"
  | "semaphore"
  | "philsms"
  | "iprog"
  | "textbee"
  | "generic";

function resolveProvider(): SmsProviderType {
  const explicit = (process.env.SMS_PROVIDER ?? "").trim().toLowerCase();
  const apiKey = (process.env.SMS_PROVIDER_API_KEY ?? "").trim();

  if (explicit === "mock") return "mock";
  if (explicit === "semaphore" && apiKey) return "semaphore";
  if (explicit === "philsms" && apiKey) return "philsms";
  if (explicit === "iprog" && apiKey) return "iprog";
  if (explicit === "textbee" && apiKey) return "textbee";
  if (explicit === "generic" && apiKey) return "generic";

  // Auto-detect from SMS_PROVIDER_URL if SMS_PROVIDER is not explicitly set
  const url = (process.env.SMS_PROVIDER_URL ?? "").trim().toLowerCase();
  if (!url || url.includes("example.com") || !apiKey) return "mock";
  if (url.includes("semaphore.co")) return "semaphore";
  if (url.includes("philsms.com")) return "philsms";
  if (url.includes("iprogtech.com")) return "iprog";
  if (url.includes("textbee.dev")) return "textbee";
  return "generic";
}

/**
 * Mock provider for development and demos:
 *   number ending 9999 -> temporary failure (exercises retries)
 *   number ending 0000 -> permanent failure
 *   anything else      -> delivered
 */
function mockSend(to: string, body: string): SendResult {
  const id = `mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  if (process.env.NODE_ENV !== "production") {
    console.info(`[SMS:MOCK] To=${to} | ID=${id} | Message="${body}"`);
  }
  if (to.endsWith("9999")) return { kind: "temporary_failure", reason: "provider_unavailable (mock)" };
  if (to.endsWith("0000")) return { kind: "permanent_failure", reason: "invalid_destination (mock)" };
  return { kind: "delivered", providerMessageId: id };
}

/**
 * 1. Semaphore SMS (https://semaphore.co) — Top PH SMS Gateway (Globe, Smart, DITO)
 * Endpoint: POST https://api.semaphore.co/api/v4/messages
 */
async function sendViaSemaphore(
  to: string,
  body: string,
  signal: AbortSignal
): Promise<SendResult> {
  const apiKey = process.env.SMS_PROVIDER_API_KEY!;
  const senderName = (process.env.SMS_SENDER_ID ?? "").trim();
  const url = process.env.SMS_PROVIDER_URL && !process.env.SMS_PROVIDER_URL.includes("example.com")
    ? process.env.SMS_PROVIDER_URL
    : "https://api.semaphore.co/api/v4/messages";

  const payload: Record<string, string> = {
    apikey: apiKey,
    number: to,
    message: body,
  };
  // Only attach sendername if configured; otherwise Semaphore uses default "SEMAPHORE"
  if (senderName) {
    payload.sendername = senderName;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (res.status === 429 || res.status >= 500) {
    return { kind: "temporary_failure", reason: `semaphore_http_${res.status}` };
  }
  if (!res.ok) {
    return { kind: "permanent_failure", reason: `semaphore_http_${res.status}` };
  }

  const data = (await res.json().catch(() => null)) as
    | Array<{ message_id?: number | string; status?: string }>
    | { message_id?: number | string }
    | null;

  const first = Array.isArray(data) ? data[0] : data;
  const messageId = first?.message_id ? String(first.message_id) : null;
  if (!messageId) {
    return { kind: "ambiguous", reason: "semaphore_missing_message_id" };
  }
  return { kind: "delivered", providerMessageId: `sem_${messageId}` };
}

/**
 * 2. PhilSMS (https://philsms.com) — Popular PH Bulk & Transactional SMS Gateway
 * Endpoint: POST https://app.philsms.com/api/v3/sms/send
 */
async function sendViaPhilSms(
  to: string,
  body: string,
  signal: AbortSignal
): Promise<SendResult> {
  const apiKey = process.env.SMS_PROVIDER_API_KEY!;
  const senderId = (process.env.SMS_SENDER_ID ?? "PhilSMS").trim();
  const url = process.env.SMS_PROVIDER_URL && !process.env.SMS_PROVIDER_URL.includes("example.com")
    ? process.env.SMS_PROVIDER_URL
    : "https://app.philsms.com/api/v3/sms/send";

  // PhilSMS prefers digits starting with 63 (e.g. 639171234567)
  const recipient = to.replace(/^\+/, "");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      recipient,
      sender_id: senderId,
      type: "plain",
      message: body,
    }),
    signal,
  });

  if (res.status === 429 || res.status >= 500) {
    return { kind: "temporary_failure", reason: `philsms_http_${res.status}` };
  }
  if (!res.ok) {
    return { kind: "permanent_failure", reason: `philsms_http_${res.status}` };
  }

  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    message?: string;
    data?: { uid?: string };
  };

  if (data.status && data.status !== "success") {
    return { kind: "permanent_failure", reason: data.message ?? "philsms_rejected" };
  }

  const uid = data.data?.uid ?? `philsms_${Date.now().toString(36)}`;
  return { kind: "delivered", providerMessageId: uid };
}

/**
 * 3. IPROG Tech SMS Philippines (https://sms.iprogtech.com)
 * Endpoint: POST https://sms.iprogtech.com/api/v1/sms_messages
 */
async function sendViaIprog(
  to: string,
  body: string,
  signal: AbortSignal
): Promise<SendResult> {
  const apiKey = process.env.SMS_PROVIDER_API_KEY!;
  const url = process.env.SMS_PROVIDER_URL && !process.env.SMS_PROVIDER_URL.includes("example.com")
    ? process.env.SMS_PROVIDER_URL
    : "https://sms.iprogtech.com/api/v1/sms_messages";

  // IPROG accepts 09XXXXXXXXX or 639XXXXXXXXX
  const phoneNumber = to.startsWith("+63") ? `0${to.slice(3)}` : to.replace(/^\+/, "");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_token: apiKey,
      phone_number: phoneNumber,
      message: body,
    }),
    signal,
  });

  if (res.status === 429 || res.status >= 500) {
    return { kind: "temporary_failure", reason: `iprog_http_${res.status}` };
  }
  if (!res.ok) {
    return { kind: "permanent_failure", reason: `iprog_http_${res.status}` };
  }

  const data = (await res.json().catch(() => ({}))) as {
    status?: number;
    message_id?: string | number;
    message?: string;
  };

  const id = data.message_id ? String(data.message_id) : `iprog_${Date.now().toString(36)}`;
  return { kind: "delivered", providerMessageId: id };
}

/**
 * 4. TextBee Android SIM Gateway (https://textbee.dev)
 * Uses your own Android phone + Philippine SIM card (Globe/Smart/DITO unli-text) for free!
 * Endpoint: POST https://api.textbee.dev/api/v1/gateway/devices/{DEVICE_ID}/send-sms
 */
async function sendViaTextBee(
  to: string,
  body: string,
  signal: AbortSignal
): Promise<SendResult> {
  const apiKey = process.env.SMS_PROVIDER_API_KEY!;
  const deviceId = (process.env.TEXTBEE_DEVICE_ID ?? "").trim();
  if (!deviceId) {
    return { kind: "permanent_failure", reason: "textbee_missing_device_id" };
  }

  const url = `https://api.textbee.dev/api/v1/gateway/devices/${encodeURIComponent(deviceId)}/send-sms`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      recipients: [to],
      message: body,
    }),
    signal,
  });

  if (res.status === 429 || res.status >= 500) {
    return { kind: "temporary_failure", reason: `textbee_http_${res.status}` };
  }
  if (!res.ok) {
    return { kind: "permanent_failure", reason: `textbee_http_${res.status}` };
  }

  const data = (await res.json().catch(() => ({}))) as {
    data?: { _id?: string; id?: string };
    id?: string;
  };
  const id = data.data?._id ?? data.data?.id ?? data.id ?? `tb_${Date.now().toString(36)}`;
  return { kind: "delivered", providerMessageId: String(id) };
}

/**
 * 5. Generic JSON Webhook SMS Provider
 */
async function sendViaGeneric(
  to: string,
  body: string,
  signal: AbortSignal
): Promise<SendResult> {
  const res = await fetch(process.env.SMS_PROVIDER_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SMS_PROVIDER_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      from: process.env.SMS_SENDER_ID || process.env.SMS_FROM_NUMBER,
      to,
      body,
    }),
    signal,
  });

  if (res.status === 429 || res.status >= 500) {
    return { kind: "temporary_failure", reason: `provider_http_${res.status}` };
  }
  if (!res.ok) {
    return { kind: "permanent_failure", reason: `provider_http_${res.status}` };
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string; messageId?: string };
  const id = data.id ?? data.messageId;
  if (!id) return { kind: "ambiguous", reason: "provider_response_missing_id" };
  return { kind: "accepted", providerMessageId: id };
}

export async function sendSms(to: string, body: string): Promise<SendResult> {
  const provider = resolveProvider();
  if (provider === "mock") return mockSend(to, body);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    switch (provider) {
      case "semaphore":
        return await sendViaSemaphore(to, body, controller.signal);
      case "philsms":
        return await sendViaPhilSms(to, body, controller.signal);
      case "iprog":
        return await sendViaIprog(to, body, controller.signal);
      case "textbee":
        return await sendViaTextBee(to, body, controller.signal);
      case "generic":
        return await sendViaGeneric(to, body, controller.signal);
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return { kind: "ambiguous", reason: "provider_timeout" };
    }
    return { kind: "temporary_failure", reason: "provider_network_error" };
  } finally {
    clearTimeout(timer);
  }
}
