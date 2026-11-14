import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateSmsConsent } from "@/app/actions/account";
import { Card, CardHeader, CardTitle, Badge } from "@/components/ui/common";
import { Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/utils";
import { Bell, ShieldCheck } from "lucide-react";

export default async function ApplicantNotificationsPage() {
  const user = await requireUser("APPLICANT");

  const [consent, deliveries] = await Promise.all([
    prisma.smsConsent.findUnique({ where: { userId: user.id } }),
    prisma.notificationDelivery.findMany({
      where: { recipientUserId: user.id },
      include: { rule: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const currentStatus = consent?.consentStatus ?? "OPTED_OUT";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-2 border-b border-[var(--color-border)]">
        <h1 className="font-display text-2xl font-normal text-[var(--color-foreground)]">
          SMS Notification Consent &amp; History
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          Control how and when the dispatch engine sends automated SMS alerts to your mobile number.
        </p>
      </div>

      {/* Consent Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4.5 w-4.5 text-[var(--color-accent)]" aria-hidden="true" />
            SMS Dispatch Notification Preferences
          </CardTitle>
          <Badge variant="status" status={currentStatus}>
            {currentStatus === "OPTED_IN" ? "Opted In" : "Opted Out"}
          </Badge>
        </CardHeader>

        <form action={updateSmsConsent} className="space-y-4">
          <input type="hidden" name="returnTo" value="/applicant/notifications" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number for SMS (PH / E.164)"
              name="phone"
              type="tel"
              defaultValue={consent?.phoneNumber ?? user.phone ?? ""}
              placeholder="09171234567 or +639171234567"
              hint="Accepts 09171234567 or +639171234567 (automatically normalized to E.164)"
            />

            <Select
              label="Consent State"
              name="consent"
              defaultValue={currentStatus}
              options={[
                { value: "OPTED_IN", label: "Opted In — Send workflow & dispatch SMS" },
                { value: "OPTED_OUT", label: "Opted Out — Do not send any SMS" },
              ]}
            />
          </div>

          {consent && (
            <div className="pl-3 border-l-2 border-[var(--color-border)] text-xs text-[var(--color-secondary)] space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-[var(--color-foreground)]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#1F6F54]" aria-hidden="true" />
                Recorded Consent Audit Evidence
              </div>
              <p>
                Number: <code>{consent.phoneNumber}</code> • State:{" "}
                <strong className="font-medium text-[var(--color-foreground)]">
                  {consent.consentStatus}
                </strong>{" "}
                • Last Consent: {formatDateTime(consent.consentAt)} (
                {consent.consentMethod ?? "web"})
                {consent.optOutAt
                  ? ` • Opted Out: ${formatDateTime(consent.optOutAt)} (${consent.optOutMethod ?? "web"})`
                  : ""}
              </p>
            </div>
          )}

          <SubmitButton>Save Notification Preference</SubmitButton>
        </form>
      </Card>

      {/* Delivery Log for this Applicant */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notification Events ({deliveries.length})</CardTitle>
        </CardHeader>

        {deliveries.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)] py-6 text-center">
            No notifications have been triggered for your account yet.
          </p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {deliveries.map((d) => (
              <div key={d.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[var(--color-foreground)]">
                    {d.rule.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {formatDateTime(d.createdAt)}
                    </span>
                    <Badge variant="status" status={d.status}>
                      {d.status}
                    </Badge>
                  </div>
                </div>
                {d.messageBody ? (
                  <p className="text-xs text-[var(--color-secondary)]">{d.messageBody}</p>
                ) : (
                  <p className="text-xs text-[#7C5313]">
                    Suppressed ({d.suppressionReason ?? "opted_out"}) — no SMS was sent.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
