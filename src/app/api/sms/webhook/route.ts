import { NextResponse } from "next/server";
import { handleDeliveryReceipt, handleInboundSms } from "@/lib/dispatch";
import { logAuditEvent } from "@/lib/auth";
import { normalizePhone } from "@/lib/validation";

/**
 * Provider webhook for inbound STOP/START keywords and delivery receipts (FR-014, FR-016).
 * Protected by x-webhook-secret header.
 */
export async function POST(request: Request) {
  const secret = process.env.SMS_WEBHOOK_SECRET;
  if (secret && request.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { type?: "inbound"; from?: string; body?: string }
    | { type?: "receipt"; providerMessageId?: string; status?: "delivered" | "failed"; reason?: string }
    | null;

  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (payload.type === "inbound" && "from" in payload) {
    const phone = normalizePhone(payload.from ?? "");
    if (!phone || !payload.body) {
      return NextResponse.json({ error: "Missing from or body" }, { status: 400 });
    }
    const result = await handleInboundSms(phone, payload.body);
    await logAuditEvent(null, `sms_webhook_${result.action}`, "sms_consent", null, {
      affected: result.affected,
    });
    return NextResponse.json({ ok: true, ...result });
  }

  if (payload.type === "receipt" && "providerMessageId" in payload) {
    if (!payload.providerMessageId || !payload.status) {
      return NextResponse.json({ error: "Missing providerMessageId or status" }, { status: 400 });
    }
    const updated = await handleDeliveryReceipt(
      payload.providerMessageId,
      payload.status,
      payload.reason
    );
    return NextResponse.json({ ok: true, updated });
  }

  return NextResponse.json({ error: "Unsupported webhook payload" }, { status: 400 });
}

