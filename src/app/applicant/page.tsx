import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, KpiCard, Badge } from "@/components/ui/common";
import { APPLICANT_NEXT_STEP, statusLabel } from "@/lib/workflow";
import { formatDate } from "@/lib/utils";
import { FileText, Briefcase, Bell, CheckCircle2, ArrowRight, Send } from "lucide-react";

export default async function ApplicantDashboardPage() {
  const user = await requireUser("APPLICANT");

  const [profile, consent, openRequestsCount] = await Promise.all([
    prisma.applicantProfile.findUnique({
      where: { userId: user.id },
      include: {
        applications: {
          include: { request: { include: { organization: true } } },
          orderBy: { updatedAt: "desc" },
        },
        assignments: {
          include: { request: { include: { organization: true } } },
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
    prisma.smsConsent.findUnique({ where: { userId: user.id } }),
    prisma.employerRequest.count({
      where: { status: { in: ["APPROVED", "IN_PROGRESS"] } },
    }),
  ]);

  const applications = profile?.applications ?? [];
  const assignments = profile?.assignments ?? [];
  const activeAssignments = assignments.filter((a) =>
    ["PLANNED", "DISPATCHED", "ACTIVE"].includes(a.status)
  );

  return (
    <div className="space-y-6">
      {/* Calm Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--color-border)]">
        <div>
          <h1 className="font-display text-2xl font-normal text-[var(--color-foreground)]">
            Welcome, {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
            Manage your bio-data and credentials, apply to open job orders, and track SMS dispatch instructions.
          </p>
        </div>
        <Link
          href="/applicant/applications"
          className="inline-flex items-center gap-2 min-h-10 px-4 rounded-md bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors self-start sm:self-auto"
        >
          Browse Open Jobs ({openRequestsCount})
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="My Applications"
          value={applications.length}
          change={`${openRequestsCount} open opportunities`}
          href="/applicant/applications"
          icon={<FileText className="h-4.5 w-4.5" />}
        />
        <KpiCard
          title="Active Assignments"
          value={activeAssignments.length}
          change={activeAssignments.length > 0 ? "Check dispatch details below" : "None active"}
          changeType={activeAssignments.length > 0 ? "positive" : "neutral"}
          href="/applicant/applications"
          icon={<Briefcase className="h-4.5 w-4.5" />}
        />
        <KpiCard
          title="SMS Consent Status"
          value={consent?.consentStatus === "OPTED_IN" ? "Opted In" : "Opted Out"}
          change={consent?.phoneNumber ?? user.phone ?? "No phone on file"}
          changeType={consent?.consentStatus === "OPTED_IN" ? "positive" : "neutral"}
          href="/applicant/profile"
          icon={<Bell className="h-4.5 w-4.5" />}
        />
        <KpiCard
          title="Profile Readiness"
          value={profile?.summary && profile?.skills ? "Complete" : "Needs Info"}
          change={profile?.preferredRole ?? "Set preferred role in profile"}
          changeType={profile?.summary ? "positive" : "neutral"}
          href="/applicant/profile"
          icon={<CheckCircle2 className="h-4.5 w-4.5" />}
        />
      </div>

      {/* Active Dispatch / Assignment Instructions */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-4.5 w-4.5 text-[var(--color-accent)]" />
              My Assignments &amp; Dispatch Instructions
            </CardTitle>
          </CardHeader>
          <div className="divide-y divide-[var(--color-border)]">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm text-[var(--color-foreground)]">
                      {assignment.request.title}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Client: {assignment.request.organization.name} • Start:{" "}
                      {assignment.startDate ? formatDate(assignment.startDate) : "TBD"}
                      {assignment.endDate ? ` — End: ${formatDate(assignment.endDate)}` : ""}
                    </p>
                  </div>
                  <Badge variant="status" status={assignment.status}>
                    {statusLabel(assignment.status)}
                  </Badge>
                </div>
                {assignment.instructions && (
                  <p className="text-xs text-[var(--color-secondary)] pl-3 border-l-2 border-[var(--color-border)]">
                    <span className="font-medium text-[var(--color-foreground)]">
                      Dispatch instructions:{" "}
                    </span>
                    {assignment.instructions}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Application Progress & Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Application Status &amp; Next Steps</CardTitle>
          <Link
            href="/applicant/applications"
            className="text-xs font-medium text-[var(--color-accent)] hover:underline"
          >
            View all &amp; apply →
          </Link>
        </CardHeader>

        {applications.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)] py-6 text-center">
            You haven&apos;t submitted any applications yet. Visit{" "}
            <Link href="/applicant/applications" className="text-[var(--color-accent)] underline">
              My Applications
            </Link>{" "}
            to apply for open opportunities.
          </p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {applications.map((app) => (
              <div key={app.id} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-medium text-sm text-[var(--color-foreground)]">
                      {app.request.title}
                    </h4>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {app.request.organization.name} • Submitted {formatDate(app.createdAt)}
                    </p>
                  </div>
                  <Badge variant="status" status={app.status}>
                    {statusLabel(app.status)}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--color-secondary)]">
                  <strong className="font-medium text-[var(--color-foreground)]">Next step:</strong>{" "}
                  {APPLICANT_NEXT_STEP[app.status] ?? "Under review by agency staff."}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
