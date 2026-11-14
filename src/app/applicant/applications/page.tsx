import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { submitApplication, withdrawApplication } from "@/app/actions/applicant";
import { Card, CardHeader, CardTitle, Badge } from "@/components/ui/common";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/input";
import { APPLICANT_NEXT_STEP, statusLabel } from "@/lib/workflow";
import { parseJsonArray } from "@/lib/validation";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Briefcase, CheckCircle2, Clock } from "lucide-react";

export default async function ApplicantApplicationsPage() {
  const user = await requireUser("APPLICANT");

  const [profile, openRequests] = await Promise.all([
    prisma.applicantProfile.findUnique({
      where: { userId: user.id },
      include: {
        applications: {
          include: {
            request: { include: { organization: true } },
            statusChanges: { orderBy: { createdAt: "desc" } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.employerRequest.findMany({
      where: { status: { in: ["APPROVED", "IN_PROGRESS"] } },
      include: { organization: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const applications = profile?.applications ?? [];
  const appliedRequestIds = new Set(applications.map((a) => a.requestId));

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-[var(--color-border)]">
        <h1 className="font-display text-2xl font-normal text-[var(--color-foreground)]">
          My Applications &amp; Open Opportunities
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          Submit applications for active job orders and track every stage from review to dispatch.
        </p>
      </div>

      {/* Existing Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Submitted Applications ({applications.length})</CardTitle>
        </CardHeader>

        {applications.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)] py-6 text-center">
            No applications submitted yet. Choose an open opportunity below to apply.
          </p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {applications.map((app) => {
              const canWithdraw = !["ACCEPTED", "REJECTED", "WITHDRAWN"].includes(app.status);
              return (
                <div key={app.id} className="py-5 first:pt-0 last:pb-0 space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-medium text-[var(--color-foreground)]">
                        {app.request.title}
                      </h3>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {app.request.organization.name} • Applied on {formatDate(app.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="status" status={app.status}>
                        {statusLabel(app.status)}
                      </Badge>
                      {canWithdraw && (
                        <form action={withdrawApplication}>
                          <input type="hidden" name="applicationId" value={app.id} />
                          <SubmitButton
                            variant="outline"
                            size="sm"
                            confirm="Withdraw this application? You will no longer be considered for this job order."
                          >
                            Withdraw
                          </SubmitButton>
                        </form>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[var(--color-secondary)] pl-3 border-l-2 border-[var(--color-border)]">
                    <span className="font-medium text-[var(--color-foreground)]">
                      Next steps:{" "}
                    </span>
                    {APPLICANT_NEXT_STEP[app.status]}
                  </p>

                  {app.coverLetter && (
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      <strong className="font-medium text-[var(--color-secondary)]">
                        Your statement:
                      </strong>{" "}
                      {app.coverLetter}
                    </p>
                  )}

                  {app.statusChanges.length > 0 && (
                    <div className="pt-1">
                      <p className="text-xs font-medium text-[var(--color-muted-foreground)] mb-1.5">
                        Status History
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-[var(--color-muted-foreground)]">
                        {app.statusChanges.map((sc) => (
                          <span
                            key={sc.id}
                            className="inline-flex items-center gap-1 bg-[var(--color-muted)] px-2.5 py-0.5 rounded-md"
                          >
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {statusLabel(sc.toStatus)} ({formatDateTime(sc.createdAt)})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Open Opportunities */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-medium text-[var(--color-foreground)]">
          Open Job Orders &amp; Staffing Opportunities ({openRequests.length})
        </h2>

        {openRequests.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--color-muted-foreground)] py-6 text-center">
              There are no open job orders at this moment. Check back soon.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {openRequests.map((req) => {
              const alreadyApplied = appliedRequestIds.has(req.id);
              const requirements = parseJsonArray(req.requirements);

              return (
                <Card key={req.id} className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                        <h3 className="text-base font-medium text-[var(--color-foreground)]">
                          {req.title}
                        </h3>
                      </div>
                      <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                        {req.organization.name} ({req.organization.industry ?? "Partner Employer"}) •{" "}
                        {req.positions} position(s) • Start:{" "}
                        {req.startDate ? formatDate(req.startDate) : "Flexible"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="status" status={req.urgency}>
                        {req.urgency} Urgency
                      </Badge>
                      <Badge variant="status" status={req.status}>
                        {statusLabel(req.status)}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-[var(--color-secondary)] prose-constrained leading-relaxed">
                    {req.description}
                  </p>

                  {requirements.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {requirements.map((item) => (
                        <span
                          key={item}
                          className="text-xs px-2.5 py-0.5 rounded-md bg-[var(--color-muted)] text-[var(--color-secondary)] font-medium"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}

                  {alreadyApplied ? (
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1F6F54] bg-[#E3F1EC] px-3 py-1.5 rounded-md">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Application already submitted
                    </div>
                  ) : (
                    <details className="pt-3 border-t border-[var(--color-border)] group">
                      <summary className="inline-flex items-center gap-1.5 min-h-9 px-3.5 rounded-md bg-[var(--color-primary)] text-white text-xs font-medium cursor-pointer list-none [&::-webkit-details-marker]:hidden group-open:bg-[var(--color-muted)] group-open:text-[var(--color-foreground)] transition-colors">
                        <span className="group-open:hidden">Apply for this job order</span>
                        <span className="hidden group-open:inline">Cancel application draft</span>
                      </summary>
                      <form
                        action={submitApplication}
                        className="mt-3 space-y-3"
                      >
                        <input type="hidden" name="requestId" value={req.id} />
                        <Textarea
                          label="Cover Statement / Relevant Experience"
                          name="coverLetter"
                          required
                          placeholder="Summarize your relevant work experience, TESDA/trade certifications, and shift availability..."
                        />
                        <SubmitButton size="sm">
                          Submit Application
                        </SubmitButton>
                      </form>
                    </details>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
