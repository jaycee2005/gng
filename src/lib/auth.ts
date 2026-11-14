import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export const SESSION_COOKIE = "session_token";
const SESSION_DAYS = 7;

export type Portal = "ADMIN" | "APPLICANT" | "EMPLOYER";

export const PORTAL_HOME: Record<Portal, string> = {
  ADMIN: "/admin",
  APPLICANT: "/applicant",
  EMPLOYER: "/employer",
};

const userInclude = {
  roles: {
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  },
} satisfies Prisma.UserInclude;

export type SessionUser = Prisma.UserGetPayload<{ include: typeof userInclude }>;

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** Creates a DB-backed session and sets the httpOnly cookie. Call from Server Actions / Route Handlers only. */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, token, expiresAt } });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  store.delete(SESSION_COOKIE);
}

/** Current user for this request (deduplicated per request), or null. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: userInclude } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.accountStatus !== "ACTIVE") return null;
  return session.user;
});

export function userPortals(user: SessionUser): Set<Portal> {
  return new Set(user.roles.map((r) => r.role.portal as Portal));
}

export function hasPermission(user: SessionUser | null, permission: string) {
  if (!user) return false;
  return user.roles.some((r) =>
    r.role.permissions.some(
      (p) => `${p.permission.resource}:${p.permission.action}` === permission
    )
  );
}

/** Guards a portal. Redirects to login when signed out, or away when the user lacks the portal. */
export async function requireUser(portal: Portal): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const portals = userPortals(user);
  if (!portals.has(portal)) {
    await logAuditEvent(user.id, "access_denied", "portal", portal);
    const own = [...portals][0];
    redirect(own ? PORTAL_HOME[own] : "/login");
  }
  return user;
}

/** Guards a staff action by permission and records denied attempts (FR-020). */
export async function requirePermission(permission: string): Promise<SessionUser> {
  const user = await requireUser("ADMIN");
  if (!hasPermission(user, permission)) {
    await logAuditEvent(user.id, "permission_denied", "permission", permission);
    redirect(`/admin?error=${encodeURIComponent("You do not have permission to do that.")}`);
  }
  return user;
}

export async function logAuditEvent(
  userId: string | null,
  action: string,
  resource: string,
  resourceId?: string | null,
  details?: Record<string, unknown>
) {
  let ipAddress: string | null = null;
  try {
    ipAddress = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  } catch {
    // outside a request (seed scripts, background processing)
  }
  await prisma.auditEvent.create({
    data: {
      userId,
      action,
      resource,
      resourceId: resourceId ?? null,
      details: details ? JSON.stringify(details) : null,
      ipAddress,
    },
  });
}
