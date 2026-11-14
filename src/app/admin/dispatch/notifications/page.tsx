import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { manualRetryNotification, runNotificationQueue } from "@/app/actions/admin";
import { AdminHeader } from "@/components/layouts/admin-layout";
import { Card, KpiCard, Badge } from "@/components/ui/common";
import { FilterPills } from "@/components/ui/filter-pills";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/utils";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldOff,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

const DELIVERY_STATUSES = ["DELIVERED", "QUEUED", "FAILED", "SUPPRESSED"] as const;

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission("dispatch:read");
  const { status } = await searchParams;
  const statusFilter = DELIVERY_STATUSES.find((s) => s === status);

  const allDeliveries = await prisma.notificationDelivery.findMany({
    include: { rule: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const count = (s: string) => allDeliveries.filter((d) => d.status === s).length;
  const deliveries = statusFilter
    ? allDeliveries.filter((d) =>
        statusFilter === "DELIVERED"
          ? d.status === "DELIVERED" || d.status === "SENT"
          : statusFilter === "QUEUED"
            ? d.status === "QUEUED" || d.status === "SENDING"
            : d.status === statusFilter
      )
    : allDeliveries;

  return (
    <div className="pb-12">
      <AdminHeader
        title="SMS Notification Delivery &amp; Failure Monitor"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <form action={runNotificationQueue}>
              <SubmitButton variant="outline" size="sm">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Process Due Queue
              </SubmitButton>
            </form>
            <Link
              href="/admin/dispatch"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-secondary)] hover:text-[var(--color-foreground)] ml-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Dispatch
            </Link>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <KpiCard
            title="Delivered"
            value={count("DELIVERED") + count("SENT")}
            change="Confirmed by SMS provider"
            changeType="positive"
            icon={<CheckCircle2 className="h-4.5 w-4.5" />}
          />
          <KpiCard
            title="Queued / Retrying"
            value={count("QUEUED") + count("SENDING")}
            change="Awaiting send or backoff window"
            icon={<Clock className="h-4.5 w-4.5" />}
          />
          <KpiCard
            title="Failed"
            value={count("FAILED")}
            change="Stopped after retry policy or permanent error"
            changeType={count("FAILED") > 0 ? "negative" : "neutral"}
            icon={<AlertTriangle className="h-4.5 w-4.5" />}
          />
          <KpiCard
            title="Suppressed (Opt-Out / Invalid)"
            value={count("SUPPRESSED")}
            change="Protected — no SMS sent"
            icon={<ShieldOff className="h-4.5 w-4.5" />}
          />
        </div>

        <Card padding="none">
          <div className="p-4 sm:p-6 border-b border-[var(--color-border)] space-y-3">
            <div>
              <h2 className="font-display text-base sm:text-lg font-medium text-[var(--color-foreground)]">
                Notification Attempt &amp; Outcome Ledger ({deliveries.length})
              </h2>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                Provider API keys and credentials are never exposed here (FR-018). Deduplicated by{" "}
                <code className="break-all">(ruleId, eventKey, recipientPhone)</code>.
              </p>
            </div>
            <FilterPills
              basePath="/admin/dispatch/notifications"
              current={statusFilter}
              options={[
                { value: "DELIVERED", label: "Delivered", count: count("DELIVERED") + count("SENT") },
                { value: "QUEUED", label: "Queued", count: count("QUEUED") + count("SENDING") },
                { value: "FAILED", label: "Failed", count: count("FAILED") },
                { value: "SUPPRESSED", label: "Suppressed", count: count("SUPPRESSED") },
              ]}
            />
          </div>

          {deliveries.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)] py-8 text-center">
              No SMS notification attempts recorded yet.
            </p>
          ) : (
            <>
              {/* Mobile Stacked Cards (< md) */}
              <div className="md:hidden divide-y divide-[var(--color-border)]">
                {deliveries.map((d) => (
                  <div key={d.id} className="p-4 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-medium text-[var(--color-foreground)] block">
                          {d.rule.name}
                        </span>
                        <code className="text-[11px] text-[var(--color-muted-foreground)] break-all">
                          {d.eventKey}
                        </code>
                      </div>
                      <Badge variant="status" status={d.status}>
                        {d.status}
                      </Badge>
                    </div>

                    <div className="text-[var(--color-secondary)] tabular-nums">
                      To: <code>{d.recipientPhone}</code> • Template v{d.templateVersion} • Attempts:{" "}
                      {d.attempts}/{d.maxRetries}
                    </div>

                    {d.messageBody && (
                      <p className="text-[var(--color-secondary)] pl-3 border-l-2 border-[var(--color-border)] break-words">
                        {d.messageBody}
                      </p>
                    )}
                    {d.failureReason && (
                      <p className="text-[var(--color-destructive)] font-medium">
                        Failure: {d.failureReason}
                      </p>
                    )}
                    {d.suppressionReason && (
                      <p className="text-[#7C5313] font-medium">
                        Suppressed: {d.suppressionReason}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[var(--color-muted-foreground)]">
                        {formatDateTime(d.createdAt)}
                      </span>
                      {d.status === "FAILED" && (
                        <form action={manualRetryNotification}>
                          <input type="hidden" name="deliveryId" value={d.id} />
                          <SubmitButton variant="outline" size="sm">
                            Retry
                          </SubmitButton>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tablet / Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50 text-left text-xs font-medium text-[var(--color-muted-foreground)]">
                      <th scope="col" className="px-4 py-3">Rule &amp; Event Key</th>
                      <th scope="col" className="px-4 py-3">Recipient</th>
                      <th scope="col" className="px-4 py-3">Message / Outcome</th>
                      <th scope="col" className="px-4 py-3">Attempts</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="px-4 py-3">Timestamp</th>
                      <th scope="col" className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {deliveries.map((d) => (
                      <tr key={d.id} className="hover:bg-[var(--color-muted)]/30 align-top">
                        <td className="px-4 py-3">
                          <span className="font-medium text-xs text-[var(--color-foreground)] block">
                            {d.rule.name}
                          </span>
                          <code className="text-[11px] text-[var(--color-muted-foreground)]">
                            {d.eventKey}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <code>{d.recipientPhone}</code>
                          <span className="block text-[11px] text-[var(--color-muted-foreground)]">
                            Template v{d.templateVersion}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs max-w-md space-y-1">
                          {d.messageBody && (
                            <p className="text-[var(--color-secondary)] break-words">
                              {d.messageBody}
                            </p>
                          )}
                          {d.failureReason && (
                            <p className="text-[var(--color-destructive)] font-medium">
                              Failure: {d.failureReason}
                            </p>
                          )}
                          {d.suppressionReason && (
                            <p className="text-[#7C5313] font-medium">
                              Suppressed: {d.suppressionReason}
                            </p>
                          )}
                          {d.providerMessageId && (
                            <p className="text-[11px] text-[var(--color-muted-foreground)]">
                              Provider ID: <code>{d.providerMessageId}</code>
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-secondary)] tabular-nums">
                          {d.attempts} / {d.maxRetries}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="status" status={d.status}>
                            {d.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                          {formatDateTime(d.createdAt)}
                          {d.lastAttemptAt && (
                            <span className="block text-[11px]">
                              Last try: {formatDateTime(d.lastAttemptAt)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {d.status === "FAILED" && (
                            <form action={manualRetryNotification}>
                              <input type="hidden" name="deliveryId" value={d.id} />
                              <SubmitButton variant="outline" size="sm">
                                Retry
                              </SubmitButton>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
