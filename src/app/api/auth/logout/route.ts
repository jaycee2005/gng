import { NextResponse } from "next/server";
import { destroySession, getSessionUser, logAuditEvent } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (user) {
    await logAuditEvent(user.id, "logout", "auth");
  }
  await destroySession();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}

