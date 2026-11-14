"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  PORTAL_HOME,
  createSession,
  hashPassword,
  logAuditEvent,
  verifyPassword,
  type Portal,
} from "@/lib/auth";
import { safePath } from "@/lib/actions";
import * as v from "@/lib/validation";

export type AuthState = { error?: string } | undefined;

const PORTALS = ["ADMIN", "APPLICANT", "EMPLOYER"] as const;

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const portal = String(form.get("portal") ?? "") as Portal;
  if (!email || !password) return { error: "Enter your email and password." };
  if (!PORTALS.includes(portal)) return { error: "Choose a portal." };

  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await logAuditEvent(user?.id ?? null, "login_failed", "auth", null, { email, portal });
    return { error: "Invalid email or password." };
  }
  if (user.accountStatus !== "ACTIVE") {
    await logAuditEvent(user.id, "login_blocked", "auth", null, { reason: user.accountStatus });
    return { error: "This account is disabled. Please contact the agency." };
  }
  if (!user.roles.some((r) => r.role.portal === portal)) {
    await logAuditEvent(user.id, "login_wrong_portal", "auth", null, { portal });
    return { error: "This account doesn't have access to that portal." };
  }

  await createSession(user.id);
  await logAuditEvent(user.id, "login_success", "auth", null, { portal });
  redirect(safePath(form.get("next"), PORTAL_HOME[portal], PORTAL_HOME[portal]));
}

export async function register(_prev: AuthState, form: FormData): Promise<AuthState> {
  let userId: string;
  let portal: "APPLICANT" | "EMPLOYER";

  try {
    portal = v.oneOf(form, "portal", ["APPLICANT", "EMPLOYER"] as const, "account type");
    const firstName = v.text(form, "firstName", { required: true, max: 60, label: "First name" });
    const lastName = v.text(form, "lastName", { required: true, max: 60, label: "Last name" });
    const email = v.email(form);
    const password = v.password(form);
    const phone = v.phone(form, "phone");
    const smsConsent = form.get("smsConsent") === "on";
    if (smsConsent && !phone) throw new v.ValidationError("Add a phone number to receive SMS updates.");

    if (await prisma.user.findUnique({ where: { email } }))
      return { error: "An account with this email already exists. Try signing in." };

    const role = await prisma.role.findUniqueOrThrow({ where: { name: portal } });
    const consent = smsConsent && phone
      ? { create: { phoneNumber: phone, consentStatus: "OPTED_IN", consentMethod: "web_registration" } }
      : undefined;

    if (portal === "APPLICANT") {
      const user = await prisma.user.create({
        data: {
          email, firstName, lastName, phone,
          passwordHash: await hashPassword(password),
          roles: { create: { roleId: role.id } },
          applicantProfile: { create: {} },
          smsConsent: consent,
        },
      });
      userId = user.id;
    } else {
      const orgName = v.text(form, "orgName", { required: true, max: 120, label: "Organization name" });
      const industry = v.text(form, "industry", { max: 80 });
      const jobTitle = v.text(form, "jobTitle", { max: 80 });
      const org = await prisma.employerOrganization.create({ data: { name: orgName, industry: industry || null } });
      const user = await prisma.user.create({
        data: {
          email, firstName, lastName, phone,
          passwordHash: await hashPassword(password),
          roles: { create: { roleId: role.id } },
          employerContact: { create: { organizationId: org.id, jobTitle: jobTitle || null, isPrimary: true } },
          smsConsent: consent,
        },
      });
      userId = user.id;
    }
  } catch (err) {
    if (err instanceof v.ValidationError) return { error: err.message };
    throw err;
  }

  await logAuditEvent(userId, "account_registered", "user", userId, { portal });
  await createSession(userId);
  redirect(PORTAL_HOME[portal]);
}

