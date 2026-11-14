"use server";

import { prisma } from "@/lib/db";
import { getSessionUser, logAuditEvent } from "@/lib/auth";
import { run, safePath } from "@/lib/actions";
import { redirect } from "next/navigation";
import * as v from "@/lib/validation";

/** Any signed-in user can manage their own SMS consent (FR-009, FR-016). */
export async function updateSmsConsent(form: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const path = safePath(form.get("returnTo"), "/");

  await run(path, async () => {
    const optIn = v.oneOf(form, "consent", ["OPTED_IN", "OPTED_OUT"] as const, "SMS preference") === "OPTED_IN";
    const now = new Date();

    if (!optIn) {
      await prisma.smsConsent.updateMany({
        where: { userId: user.id },
        data: { consentStatus: "OPTED_OUT", optOutAt: now, optOutMethod: "web_form" },
      });
      await logAuditEvent(user.id, "sms_opt_out", "sms_consent", user.id);
      return "You will no longer receive SMS notifications.";
    }

    const phone = v.phone(form, "phone", true)!;
    const data = { phoneNumber: phone, consentStatus: "OPTED_IN", consentMethod: "web_form", consentAt: now, optOutAt: null, optOutMethod: null };
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { phone } }),
      prisma.smsConsent.upsert({ where: { userId: user.id }, update: data, create: { userId: user.id, ...data } }),
    ]);
    await logAuditEvent(user.id, "sms_opt_in", "sms_consent", user.id, { method: "web_form" });
    return "SMS notifications enabled for this number.";
  });
}

