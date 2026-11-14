import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createAssignment,
  updateAssignmentStatus,
  reprocessAssignmentEvent,
} from "@/app/actions/admin";
import { AdminHeader } from "@/components/layouts/admin-layout";
import { Card, KpiCard, Badge, CollapsibleCard } from "@/components/ui/common";
import { Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { nextStatuses, statusLabel } from "@/lib/workflow";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Send, RefreshCw, Bell, CheckCircle2, Clock } from "lucide-react";

export default async function AdminDispatchPage() {
  await requirePermission("dispatch:read");

  const [assignments, applicants, openRequests] = await Promise.all([
    prisma.assignment.findMany({
      include: {
        applicant: { include: { user: { include: { smsConsent: true } } } },
        request: { include: { organization: true } },
        assignedBy: true,
        notifications: { include: { rule: true }, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.applicantProfile.findMany({
      include: { user: { include: { smsConsent: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employerRequest.findMany({
      where: { status: { notIn: ["CANCELLED", "CLOSED"] } },
      include: { organization: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const countByStatus = (s: string) => assignments.filter((a) => a.status === s).length;

  return (
    <div className="pb-12">
      <AdminHeader
        title="Dispatch &amp; Assignment Engine"
        actions={
          <Link
            href="/admin/dispatch/notifications"
            className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-md bg-[var(--color-primary)] text-white text-xs font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            <Bell className="h-3.5 w-3.5" aria-hidden="true" /> View SMS Delivery Log
          </Link>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <KpiCard
            title="Planned"
            value={countByStatus("PLANNED")}
            change="Ready for dispatch"
            icon={<Clock className="h-4.5 w-4.5" />}
          />
          <KpiCard
            title="Dispatched"
            value={countByStatus("DISPATCHED")}
            change="SMS notifications evaluated"
            changeType="positive"
            icon={<Send className="h-4.5 w-4.5" />}
          />
          <KpiCard
            title="Active On-Site"
            value={countByStatus("ACTIVE")}
            change="Currently engaged"
            changeType="positive"
            icon={<CheckCircle2 className="h-4.5 w-4.5" />}
          />
          <KpiCard
            title="Completed"
            value={countByStatus("COMPLETED")}
            change="Finished engagements"
            icon={<CheckCircle2 className="h-4.5 w-4.5" />}
          />
        </div>

        {/* Create Assignment & Trigger Dispatch */}
        <CollapsibleCard
          title="Create Worker Assignment / Trigger Dispatch SMS"
          subtitle="Assign a vetted applicant to an open employer request and evaluate SMS dispatch rules"
          actionLabel="+ New Assignment"
          defaultOpen={assignments.length === 0}
        >
          <form action={createAssignment} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Applicant"
                name="applicantId"
                required
                options={applicants.map((a) => ({
                  value: a.id,
                  label: `${a.user.firstName} ${a.user.lastName} (SMS: ${
                    a.user.smsConsent?.consentStatus ?? "NO_CONSENT"
                  })`,
                }))}
              />
              <Select
                label="Employer Request"
                name="requestId"
                required
                options={openRequests.map((r) => ({
                  value: r.id,
                  label: `${r.title} — ${r.organization.name} (${statusLabel(r.status)})`,
                }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Start Date" name="startDate" type="date" />
              <Input label="End Date" name="endDate" type="date" />
            </div>

            <Textarea
              label="Dispatch &amp; Reporting Instructions (visible to worker in portal)"
              name="instructions"
              required
              placeholder="Reporting site, client point of contact, shift schedule, and uniform or ID requirements..."
            />

            <Input
              label="Internal Staff Notes"
              name="notes"
              placeholder="Optional internal note..."
            />

            <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-foreground)] cursor-pointer">
              <input
                type="checkbox"
                name="dispatchNow"
                defaultChecked
                className="h-4 w-4 rounded accent-[var(--color-primary)]"
              />
              Dispatch immediately and evaluate automated SMS notification rules
            </label>

            <SubmitButton size="sm">
              Record Assignment
            </SubmitButton>
          </form>
        </CollapsibleCard>

        {/* Active & Historical Assignments */}
        <div className="space-y-4">
          <h2 className="font-display text-lg font-medium text-[var(--color-foreground)]">
            Assignments &amp; Dispatch Events ({assignments.length})
          </h2>

          {assignments.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--color-muted-foreground)] py-8 text-center">
                No worker assignments recorded yet.
              </p>
            </Card>
          ) : (
            assignments.map((a) => {
              const allowed = nextStatuses("Assignment", a.status);
              const consentState = a.applicant.user.smsConsent?.consentStatus ?? "NO_CONSENT";

              return (
                <Card key={a.id} className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-medium text-[var(--color-foreground)]">
                        {a.applicant.user.firstName} {a.applicant.user.lastName} →{" "}
                        <Link
                          href={`/admin/requests/${a.requestId}`}
                          className="text-[var(--color-accent)] hover:underline"
                        >
                          {a.request.title}
                        </Link>
                      </h3>
                      <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                        Client: {a.request.organization.name} • Start:{" "}
                        {a.startDate ? formatDate(a.startDate) : "Immediate"} • Assigned by{" "}
                        {a.assignedBy.firstName} {a.assignedBy.lastName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="status" status={consentState}>
                        Applicant SMS: {consentState}
                      </Badge>
                      <Badge variant="status" status={a.status}>
                        {statusLabel(a.status)}
                      </Badge>
                    </div>
                  </div>

                  {a.instructions && (
                    <p className="text-xs text-[var(--color-secondary)] pl-3 border-l-2 border-[var(--color-border)] leading-relaxed">
                      <strong className="font-medium text-[var(--color-foreground)]">
                        Dispatch instructions:
                      </strong>{" "}
                      {a.instructions}
                    </p>
                  )}

                  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-3 border-t border-[var(--color-border)]">
                    {allowed.length > 0 ? (
                      <form
                        action={updateAssignmentStatus}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end flex-1"
                      >
                        <input type="hidden" name="assignmentId" value={a.id} />
                        <input type="hidden" name="fromStatus" value={a.status} />
                        <Select
                          label="Change Status"
                          name="toStatus"
                          defaultValue={allowed[0]}
                          options={allowed.map((s) => ({ value: s, label: statusLabel(s) }))}
                        />
                        <Input
                          label="Reason / Update Note"
                          name="reason"
                          placeholder="Reason for status update..."
                        />
                        <SubmitButton size="sm" className="w-full sm:w-auto">
                          Update Status
                        </SubmitButton>
                      </form>
                    ) : (
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        Terminal status ({statusLabel(a.status)}).
                      </span>
                    )}

                    {a.status === "DISPATCHED" && (
                      <form action={reprocessAssignmentEvent}>
                        <input type="hidden" name="assignmentId" value={a.id} />
                        <SubmitButton variant="outline" size="sm" className="w-full sm:w-auto">
                          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                          Test Reprocess Event (Idempotency Check)
                        </SubmitButton>
                      </form>
                    )}
                  </div>

                  {a.notifications.length > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                        Linked SMS Deliveries ({a.notifications.length} — previously delivered SMS cannot be recalled):
                      </p>
                      <div className="divide-y divide-[var(--color-border)] text-xs">
                        {a.notifications.map((n) => (
                          <div
                            key={n.id}
                            className="py-1.5 flex flex-wrap items-center justify-between gap-2"
                          >
                            <span>
                              <strong className="font-medium text-[var(--color-foreground)]">
                                {n.rule.name}
                              </strong>{" "}
                              → <code>{n.recipientPhone}</code> (v
                              {n.templateVersion}, {n.attempts} attempt(s))
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--color-muted-foreground)]">
                                {formatDateTime(n.createdAt)}
                              </span>
                              <Badge variant="status" status={n.status}>
                                {n.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
