import { NextResponse } from "next/server";
import { processQueue } from "@/lib/dispatch";

/** Processes due queued SMS notifications (scheduled retries). */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const processed = await processQueue();
  return NextResponse.json({ ok: true, processed });
}

