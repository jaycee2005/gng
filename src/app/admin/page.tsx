import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminHeader } from "@/components/layouts/admin-layout";
import { Card, CardHeader, CardTitle, KpiCard, Badge } from "@/components/ui/common";
import { statusLabel } from "@/lib/workflow";
import { formatDateTime } from "@/lib/utils";
import {
  FileText,
  ClipboardList,
  Send,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const user = await requireUser("ADMIN");
  const roleNames = user.roles.map((r) => r.role.name).join(", ");

  const [
    totalRequests,
    activeApplications,
    activeAssignments,
    failedOrQueuedNotifications,
    recentStatusChanges,
    recentDeliveries,
  ] = await Promise.all([
    prisma.employerRequest.count(),
    prisma.application.count({
      where: { status: { in: ["SUBMITTED", "SCREENING", "SHORTLISTED", "INTERVIEW", "OFFERED"] } },
    }),
    prisma.assignment.count({
      where: { status: { in: ["PLANNED", "DISPATCHED", "ACTIVE"] } },
    }),
    prisma.notificationDelivery.count({
      where: { status: { in: ["FAILED", "QUEUED"] } },
    }),
    prisma.statusChange.findMany({
      include: { changedBy: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.notificationDelivery.findMany({
      include: { rule: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div className="pb-12">
      <AdminHeader
        title="Operations & Dispatch Overview"
        actions={
          <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[var(--color-muted)] border border-[var(--color-border)] text-[var(--color-secondary)]">
            Role: {roleNames}
          </span>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* KPI Row — Directly clickable into primary queues */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <KpiCard
            title="Employer Requests"
            value={totalRequests}
            change="Review intake & fulfillment"
            href="/admin/requests"
            icon={<FileText className="h-4.5 w-4.5" />}
          />
          <KpiCard
            title="Active Applications"
            value={activeApplications}
            change="In screening & interview pipeline"
            changeType="positive"
            href="/admin/applications"
            icon={<ClipboardList className="h-4.5 w-4.5" />}
          />
          <KpiCard
            title="Active Assignments"
            value={activeAssignments}
            change="Planned or dispatched placements"
            changeType="positive"
            href="/admin/dispatch"
            icon={<Send className="h-4.5 w-4.5" />}
          />
          <KpiCard
            title="Pending / Failed SMS"
            value={failedOrQueuedNotifications}
            change={
              failedOrQueuedNotifications > 0
                ? "Requires attention in Dispatch"
                : "All eligible SMS delivered"
            }
            changeType={failedOrQueuedNotifications > 0 ? "negative" : "positive"}
            href={
              failedOrQueuedNotifications > 0
                ? "/admin/dispatch/notifications?status=FAILED"
                : "/admin/dispatch/notifications"
            }
            icon={
              failedOrQueuedNotifications > 0 ? (
                <AlertTriangle className="h-4.5 w-4.5" />
              ) : (
                <CheckCircle2 className="h-4.5 w-4.5" />
              )
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Status Changes */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Workflow History</CardTitle>
              <Link
                href="/admin/audit"
                className="text-xs font-medium text-[var(--color-accent)] hover:underline"
              >
                Full audit log →
              </Link>
            </CardHeader>
            {recentStatusChanges.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)] py-6 text-center">
                No workflow status transitions recorded yet.
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {recentStatusChanges.map((sc) => (
                  <div key={sc.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[var(--color-foreground)] flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                        {sc.entityType}: {sc.fromStatus ? `${statusLabel(sc.fromStatus)} → ` : ""}
                        {statusLabel(sc.toStatus)}
                      </span>
                      <Badge variant="status" status={sc.toStatus}>
                        {statusLabel(sc.toStatus)}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      By {sc.changedBy.firstName} {sc.changedBy.lastName} •{" "}
                      {formatDateTime(sc.createdAt)}
                      {sc.reason ? ` — "${sc.reason}"` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent SMS Deliveries */}
          <Card>
            <CardHeader>
              <CardTitle>Latest Dispatch SMS Outcomes</CardTitle>
              <Link
                href="/admin/dispatch/notifications"
                className="text-xs font-medium text-[var(--color-accent)] hover:underline"
              >
                All notifications →
              </Link>
            </CardHeader>
            {recentDeliveries.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)] py-6 text-center">
                No SMS delivery attempts logged yet.
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {recentDeliveries.map((d) => (
                  <div key={d.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[var(--color-foreground)]">
                        {d.rule.name}
                      </span>
                      <Badge variant="status" status={d.status}>
                        {d.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      To: <code>{d.recipientPhone}</code> • Attempts: {d.attempts}/{d.maxRetries} •{" "}
                      {formatDateTime(d.createdAt)}
                    </p>
                    {d.suppressionReason && (
                      <p className="text-xs text-[#7C5313]">
                        Suppressed: {d.suppressionReason}
                      </p>
                    )}
                    {d.failureReason && (
                      <p className="text-xs text-[var(--color-destructive)]">
                        Failure: {d.failureReason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
