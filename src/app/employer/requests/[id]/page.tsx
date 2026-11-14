import Link from "next/link";
import { requireUser, logAuditEvent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cancelEmployerRequest, respondToCandidateShare } from "@/app/actions/employer";
import { Card, CardHeader, CardTitle, Badge } from "@/components/ui/common";
import { Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { EMPLOYER_RESPONSES, statusLabel } from "@/lib/workflow";
import { parseJsonArray } from "@/lib/validation";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ShieldAlert, ArrowLeft, Users, Clock } from "lucide-react";

type SharedSnapshot = {
  candidateName?: string;
  preferredRole?: string | null;
  summaryNote?: string;
  skills?: string[];
  experience?: string[];
  qualifications?: string[];
  availability?: string | null;
};

export default async function EmployerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser("EMPLOYER");

  const contact = await prisma.employerContact.findUnique({
    where: { userId: user.id },
    include: { organization: true },
  });

  const request = await prisma.employerRequest.findUnique({
    where: { id },
    include: {
      organization: true,
      candidateShares: { orderBy: { createdAt: "desc" } },
      assignments: { orderBy: { createdAt: "desc" } },
      statusChanges: { orderBy: { createdAt: "desc" } },
    },
  });

  // Strict organization access check (FR-004, FR-022, User Story 3 Scenario 3)
  if (!request || !contact || request.organizationId !== contact.organizationId) {
    await logAuditEvent(user.id, "unauthorized_employer_request_view", "request", id);
    return (
      <Card className="border-[var(--color-destructive)]/30 bg-[#FBEBEB]/40">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-[var(--color-destructive)] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h1 className="font-display text-lg font-medium text-[var(--color-foreground)]">
              Access Denied
            </h1>
            <p className="text-sm text-[var(--color-secondary)] mt-1">
              You are only authorized to view staffing requests belonging to{" "}
              <strong className="font-medium text-[var(--color-foreground)]">
                {contact?.organization.name ?? "your organization"}
              </strong>
              . This access attempt has been logged.
            </p>
            <Link
              href="/employer/requests"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Return to My Requests
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  const requirements = parseJsonArray(request.requirements);
  const canCancel = !["CANCELLED", "CLOSED", "FILLED"].includes(request.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-2 border-b border-[var(--color-border)]">
        <div>
          <h1 className="font-display text-2xl font-normal text-[var(--color-foreground)]">
            {request.title}
          </h1>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            Submitted {formatDate(request.createdAt)} • {request.positions} position(s) • Start:{" "}
            {request.startDate ? formatDate(request.startDate) : "TBD"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="status" status={request.urgency}>
            {request.urgency} Urgency
          </Badge>
          <Badge variant="status" status={request.status}>
            {statusLabel(request.status)}
          </Badge>
          <Link
            href="/employer/requests"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-secondary)] hover:text-[var(--color-foreground)] ml-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to Requests
          </Link>
        </div>
      </div>

      {/* Request Summary */}
      <Card className="space-y-4">
        <CardHeader>
          <CardTitle>Engagement Requirements</CardTitle>
        </CardHeader>
        <p className="text-sm text-[var(--color-secondary)] prose-constrained leading-relaxed">
          {request.description}
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

        {canCancel && (
          <details className="pt-4 border-t border-[var(--color-border)] group">
            <summary className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-destructive)] hover:underline cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              Cancel this staffing request…
            </summary>
            <form
              action={cancelEmployerRequest}
              className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-end gap-3 p-3.5 rounded-md border border-[var(--color-destructive)]/25 bg-[#F6E6E6]/35"
            >
              <input type="hidden" name="requestId" value={request.id} />
              <div className="flex-1">
                <Input
                  label="Cancellation reason (required for audit log)"
                  name="reason"
                  required
                  placeholder="e.g. Budget reprioritized or role filled internally"
                />
              </div>
              <SubmitButton
                variant="destructive"
                size="md"
                confirm="Are you sure you want to cancel this staffing request? This action cannot be undone."
              >
                Confirm Cancellation
              </SubmitButton>
            </form>
          </details>
        )}
      </Card>

      {/* Shared Candidates (FR-006, FR-022) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-[var(--color-accent)]" aria-hidden="true" />
            Candidates Shared by G&amp;G Manpower ({request.candidateShares.length})
          </CardTitle>
        </CardHeader>

        {request.candidateShares.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)] py-6 text-center">
            Agency staff have not shared candidate profiles for this request yet.
          </p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {request.candidateShares.map((share) => {
              let snapshot: SharedSnapshot = {};
              try {
                snapshot = JSON.parse(share.sharedInfo ?? "{}") as SharedSnapshot;
              } catch {
                snapshot = {};
              }

              return (
                <div key={share.id} className="py-5 first:pt-0 last:pb-0 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-medium text-[var(--color-foreground)]">
                        {snapshot.candidateName ?? "Vetted Candidate"}
                        {snapshot.preferredRole ? ` — ${snapshot.preferredRole}` : ""}
                      </h3>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Shared on {formatDateTime(share.createdAt)}
                        {snapshot.availability ? ` • Availability: ${snapshot.availability}` : ""}
                      </p>
                    </div>
                    {share.response ? (
                      <Badge variant="status" status="APPROVED">
                        Responded: {share.response}
                      </Badge>
                    ) : (
                      <Badge variant="status" status="UNDER_REVIEW">
                        Awaiting Your Response
                      </Badge>
                    )}
                  </div>

                  {snapshot.summaryNote && (
                    <p className="text-sm text-[var(--color-secondary)] pl-3 border-l-2 border-[var(--color-border)] leading-relaxed">
                      {snapshot.summaryNote}
                    </p>
                  )}

                  {snapshot.skills && snapshot.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {snapshot.skills.map((skill) => (
                        <span
                          key={skill}
                          className="text-xs px-2.5 py-0.5 rounded-md bg-[var(--color-muted)] text-[var(--color-secondary)] font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {snapshot.qualifications && snapshot.qualifications.length > 0 && (
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      <strong className="font-medium text-[var(--color-foreground)]">
                        Qualifications:
                      </strong>{" "}
                      {snapshot.qualifications.join(" • ")}
                    </p>
                  )}

                  {share.response ? (
                    <div className="pt-2 space-y-2">
                      <p className="text-xs text-[var(--color-secondary)] bg-[var(--color-muted)]/60 px-3 py-2 rounded-md">
                        <strong className="font-medium text-[var(--color-foreground)]">
                          Recorded response:
                        </strong>{" "}
                        {share.response}
                      </p>
                      <details className="text-xs">
                        <summary className="font-medium text-[var(--color-accent)] hover:underline cursor-pointer">
                          Update recorded response…
                        </summary>
                        <form
                          action={respondToCandidateShare}
                          className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
                        >
                          <input type="hidden" name="shareId" value={share.id} />
                          <input
                            type="hidden"
                            name="returnTo"
                            value={`/employer/requests/${request.id}`}
                          />
                          <Select
                            label="Your Decision"
                            name="decision"
                            defaultValue={
                              EMPLOYER_RESPONSES.find((r) => share.response?.startsWith(r.value))
                                ?.value ?? "INTERESTED"
                            }
                            options={EMPLOYER_RESPONSES.map((r) => ({
                              value: r.value,
                              label: r.label,
                            }))}
                          />
                          <Input
                            label="Updated Interview / Feedback Notes"
                            name="note"
                            placeholder="Updated feedback or interview time..."
                          />
                          <SubmitButton size="md">Update Response</SubmitButton>
                        </form>
                      </details>
                    </div>
                  ) : (
                    <form
                      action={respondToCandidateShare}
                      className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
                    >
                      <input type="hidden" name="shareId" value={share.id} />
                      <input
                        type="hidden"
                        name="returnTo"
                        value={`/employer/requests/${request.id}`}
                      />
                      <Select
                        label="Your Decision"
                        name="decision"
                        defaultValue="INTERESTED"
                        options={EMPLOYER_RESPONSES.map((r) => ({ value: r.value, label: r.label }))}
                      />
                      <Input
                        label="Interview / Feedback Notes"
                        name="note"
                        placeholder="Available Tuesday 2pm PHT for panel interview..."
                      />
                      <SubmitButton size="md">Record Response</SubmitButton>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Request Status History</CardTitle>
        </CardHeader>
        {request.statusChanges.length === 0 ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            No status transitions recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {request.statusChanges.map((sc) => (
              <div
                key={sc.id}
                className="flex flex-wrap items-center justify-between gap-2 text-xs py-2 border-b last:border-0 border-[var(--color-border)]"
              >
                <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-foreground)]">
                  <Clock className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" aria-hidden="true" />
                  {sc.fromStatus ? `${statusLabel(sc.fromStatus)} → ` : ""}
                  <strong>{statusLabel(sc.toStatus)}</strong>
                  {sc.reason ? ` — ${sc.reason}` : ""}
                </span>
                <span className="text-[var(--color-muted-foreground)]">
                  {formatDateTime(sc.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
