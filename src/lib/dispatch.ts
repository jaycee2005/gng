// Dispatch engine: turns workflow events into SMS deliveries (User Story 4, FR-010..FR-016).
//
// Flow: emitEvent() -> matching enabled rules -> recipients -> eligibility check
//       -> one NotificationDelivery per (rule, eventKey, phone)  [dedup via unique index]
//       -> processQueue() sends due deliveries, re-checking eligibility at send time.

import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { sendSms } from "./sms";
import { renderTemplate, type TemplateVars } from "./templates";
import { isValidPhone } from "./validation";

export const EVENT_TYPES = [
  { value: "assignment_dispatched", label: "Assignment dispatched" },
  { value: "assignment_cancelled", label: "Assignment cancelled" },
  { value: "application_status_changed", label: "Application status changed" },
  { value: "candidate_shared", label: "Candidate shared with employer" },
  { value: "request_submitted", label: "New employer request submitted" },
] as const;

export const RECIPIENT_ROLES = ["applicant", "employer", "staff"] as const;

export type EventType = (typeof EVENT_TYPES)[number]["value"];
export type RecipientRole = (typeof RECIPIENT_ROLES)[number];

export type DispatchEvent = {
  type: EventType;
  /** Unique per event occurrence. Reprocessing the same key never sends twice (FR-013). */
  eventKey: string;
  applicantUserId?: string;
  organizationId?: string;
  assignmentId?: string;
  /** Portal path per recipient role. Recipients must sign in to see it (FR-012). */
  links: Partial<Record<RecipientRole, string>>;
  vars: Omit<TemplateVars, "first_name" | "portal_link">;
};

const DEFAULT_LINKS: Record<RecipientRole, string> = {
  applicant: "/applicant",
  employer: "/employer",
  staff: "/admin",
};

const RETRY_BASE_MS = 30_000;
const MAX_ATTEMPTS = Number(process.env.SMS_MAX_ATTEMPTS ?? 3);

const recipientSelect = {
  id: true,
  firstName: true,
  phone: true,
  accountStatus: true,
  smsConsent: { select: { phoneNumber: true, consentStatus: true } },
} satisfies Prisma.UserSelect;

type Recipient = Prisma.UserGetPayload<{ select: typeof recipientSelect }>;

/** Why this user must not receive SMS right now, or null when eligible. */
export function suppressionReason(user: Recipient): string | null {
  if (user.accountStatus !== "ACTIVE") return "account_inactive";
  if (!user.smsConsent) return "no_consent";
  if (user.smsConsent.consentStatus !== "OPTED_IN") return "opted_out";
  if (!isValidPhone(user.smsConsent.phoneNumber)) return "invalid_phone";
  if (user.phone && user.phone !== user.smsConsent.phoneNumber) return "phone_changed_since_consent";
  return null;
}

async function resolveRecipients(role: string, event: DispatchEvent): Promise<Recipient[]> {
  switch (role) {
    case "applicant":
      if (!event.applicantUserId) return [];
      return prisma.user.findMany({ where: { id: event.applicantUserId }, select: recipientSelect });
    case "employer":
      if (!event.organizationId) return [];
      return prisma.user.findMany({
        where: { employerContact: { organizationId: event.organizationId } },
        select: recipientSelect,
      });
    case "staff":
      return prisma.user.findMany({
        where: { roles: { some: { role: { portal: "ADMIN" } } } },
        select: recipientSelect,
      });
    default:
      return [];
  }
}

function portalLink(path: string) {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/login?next=${encodeURIComponent(path)}`;
}

function isUniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/** Records deliveries for an event, then sends whatever is due. Call after the event is committed. */
export async function emitEvent(event: DispatchEvent) {
  const rules = await prisma.notificationRule.findMany({
    where: { eventType: event.type, isEnabled: true, template: { isActive: true } },
    include: { template: true },
  });

  for (const rule of rules) {
    const role = rule.recipientRole as RecipientRole;
    const recipients = await resolveRecipients(role, event);

    for (const user of recipients) {
      let reason = suppressionReason(user);
      let messageBody = "";

      if (!reason) {
        const rendered = renderTemplate(rule.template.body, {
          ...event.vars,
          first_name: user.firstName,
          portal_link: portalLink(event.links[role] ?? DEFAULT_LINKS[role]),
        });
        if (rendered.ok) messageBody = rendered.message;
        else reason = rendered.reason;
      }

      const recipientPhone = user.smsConsent?.phoneNumber ?? user.phone ?? `none:${user.id}`;

      try {
        await prisma.notificationDelivery.create({
          data: {
            ruleId: rule.id,
            eventKey: event.eventKey,
            assignmentId: event.assignmentId ?? null,
            recipientUserId: user.id,
            recipientPhone,
            messageBody,
            templateVersion: rule.template.version,
            maxRetries: MAX_ATTEMPTS,
            status: reason ? "SUPPRESSED" : "QUEUED",
            suppressionReason: reason,
          },
        });
      } catch (err) {
        // Same event + rule + phone already recorded: duplicate, skip (also covers shared phones).
        if (!isUniqueViolation(err)) throw err;
      }
    }
  }

  await processQueue();
}

/** Sends all due deliveries. Safe to run concurrently (each delivery is claimed atomically). */
export async function processQueue(limit = 50) {
  const due = await prisma.notificationDelivery.findMany({
    where: {
      status: "QUEUED",
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });

  for (const { id } of due) await sendOne(id);
  return due.length;
}

async function sendOne(id: string) {
  const claimed = await prisma.notificationDelivery.updateMany({
    where: { id, status: "QUEUED" },
    data: { status: "SENDING" },
  });
  if (claimed.count === 0) return;

  const delivery = await prisma.notificationDelivery.findUniqueOrThrow({ where: { id } });

  // Re-check at send time: the recipient may have opted out, changed number or been disabled.
  if (delivery.recipientUserId) {
    const user = await prisma.user.findUnique({
      where: { id: delivery.recipientUserId },
      select: recipientSelect,
    });
    let reason = user ? suppressionReason(user) : "recipient_missing";
    if (!reason && user?.smsConsent?.phoneNumber !== delivery.recipientPhone) reason = "phone_changed_since_queued";
    if (reason) {
      await prisma.notificationDelivery.update({
        where: { id },
        data: { status: "SUPPRESSED", suppressionReason: reason },
      });
      return;
    }
  }

  const attempts = delivery.attempts + 1;
  const now = new Date();
  const result = await sendSms(delivery.recipientPhone, delivery.messageBody);
  const base = { attempts, lastAttemptAt: now };

  let data: Prisma.NotificationDeliveryUpdateInput;
  switch (result.kind) {
    case "delivered":
      data = { ...base, status: "DELIVERED", deliveredAt: now, providerMessageId: result.providerMessageId, failureReason: null };
      break;
    case "accepted":
      data = { ...base, status: "SENT", providerMessageId: result.providerMessageId, failureReason: null };
      break;
    case "temporary_failure":
      data =
        attempts < delivery.maxRetries
          ? { ...base, status: "QUEUED", failureReason: result.reason, nextAttemptAt: new Date(now.getTime() + RETRY_BASE_MS * 2 ** (attempts - 1)) }
          : { ...base, status: "FAILED", failureReason: `${result.reason} (gave up after ${attempts} attempts)`, nextAttemptAt: null };
      break;
    case "permanent_failure":
      data = { ...base, status: "FAILED", failureReason: result.reason, nextAttemptAt: null };
      break;
    case "ambiguous":
      data = { ...base, status: "FAILED", failureReason: `${result.reason}: outcome unknown, not retried automatically to avoid a duplicate`, nextAttemptAt: null };
      break;
  }
  await prisma.notificationDelivery.update({ where: { id }, data });
}

/** Manual staff retry of a FAILED delivery. Returns false when it isn't retryable. */
export async function retryDelivery(id: string) {
  const delivery = await prisma.notificationDelivery.findUnique({ where: { id } });
  if (!delivery || delivery.status !== "FAILED") return false;
  await prisma.notificationDelivery.update({
    where: { id },
    data: { status: "QUEUED", nextAttemptAt: null, maxRetries: Math.max(delivery.maxRetries, delivery.attempts + 1) },
  });
  await sendOne(id);
  return true;
}

const STOP_WORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "OPTOUT"];
const START_WORDS = ["START", "UNSTOP"];

/** Provider inbound message: honours opt-out / opt-in keywords for every consent on that number. */
export async function handleInboundSms(from: string, body: string) {
  const word = body.trim().toUpperCase();
  if (STOP_WORDS.includes(word)) {
    const res = await prisma.smsConsent.updateMany({
      where: { phoneNumber: from },
      data: { consentStatus: "OPTED_OUT", optOutAt: new Date(), optOutMethod: "sms_keyword" },
    });
    return { action: "opted_out" as const, affected: res.count };
  }
  if (START_WORDS.includes(word)) {
    const res = await prisma.smsConsent.updateMany({
      where: { phoneNumber: from },
      data: { consentStatus: "OPTED_IN", consentAt: new Date(), consentMethod: "sms_keyword", optOutAt: null, optOutMethod: null },
    });
    return { action: "opted_in" as const, affected: res.count };
  }
  return { action: "ignored" as const, affected: 0 };
}

/** Provider delivery receipt for a message previously accepted (SENT). */
export async function handleDeliveryReceipt(providerMessageId: string, status: "delivered" | "failed", reason?: string) {
  const res = await prisma.notificationDelivery.updateMany({
    where: { providerMessageId, status: { in: ["SENT", "SENDING"] } },
    data:
      status === "delivered"
        ? { status: "DELIVERED", deliveredAt: new Date() }
        : { status: "FAILED", failureReason: reason ?? "carrier_reported_failure" },
  });
  return res.count;
}

