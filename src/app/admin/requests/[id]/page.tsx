import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  updateRequestStatus,
  updateApplicationStatus,
  shareCandidateWithEmployer,
} from "@/app/actions/admin";
import { AdminHeader } from "@/components/layouts/admin-layout";
import { Card, CardHeader, CardTitle, Badge } from "@/components/ui/common";
import { Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { nextStatuses, statusLabel } from "@/lib/workflow";
import { parseJsonArray } from "@/lib/validation";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ArrowLeft, Share2, Clock } from "lucide-react";

export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission("requests:read");

  const [request, allApplicants] = await Promise.all([
    prisma.employerRequest.findUnique({
      where: { id },
      include: {
        organization: true,
        applications: {
          include: { applicant: { include: { user: true } } },
          orderBy: { createdAt: "desc" },
        },
        candidateShares: {
          include: {
            applicant: { include: { user: true } },
            sharedBy: true,
          },
          orderBy: { createdAt: "desc" },
        },
        assignments: {
          include: { applicant: { include: { user: true } } },
          orderBy: { createdAt: "desc" },
        },
        statusChanges: {
          include: { changedBy: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.applicantProfile.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!request) notFound();

  const allowedNext = nextStatuses("Request", request.status);
  const requirements = parseJsonArray(request.requirements);
  const applicationByApplicantId = new Map(
    request.applications.map((app) => [app.applicantId, app])
  );
  const sortedApplicants = [...allApplicants].sort((a, b) => {
    const aApplied = applicationByApplicantId.has(a.id) ? 0 : 1;
    const bApplied = applicationByApplicantId.has(b.id) ? 0 : 1;
    return aApplied - bApplied;
  });

  return (
    <div className="pb-12">
      <AdminHeader
        title={request.title}
        actions={
          <Link
            href="/admin/requests"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> All Requests
          </Link>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Request Details & Status Transition */}
        <Card className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-medium text-[var(--color-foreground)]">
                {request.title}
              </h2>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                Client: <strong className="font-medium text-[var(--color-foreground)]">{request.organization.name}</strong> ({request.organization.industry ?? "Corporate"}) • Positions: {request.positions} • Start:{" "}
                {request.startDate ? formatDate(request.startDate) : "Flexible"} • Created:{" "}
                {formatDate(request.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="status" status={request.urgency}>
                {request.urgency} Urgency
              </Badge>
              <Badge variant="status" status={request.status}>
                {statusLabel(request.status)}
              </Badge>
            </div>
          </div>

          <p className="text-sm text-[var(--color-secondary)] prose-constrained">
            {request.description}
          </p>

          {requirements.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {requirements.map((req) => (
                <span
                  key={req}
                  className="text-xs px-2.5 py-0.5 rounded-md bg-[var(--color-muted)] text-[var(--color-secondary)] font-medium"
                >
                  {req}
                </span>
              ))}
            </div>
          )}

          {allowedNext.length > 0 && (
            <form
              action={updateRequestStatus}
              className="pt-4 border-t border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
            >
              <input type="hidden" name="requestId" value={request.id} />
              <input type="hidden" name="fromStatus" value={request.status} />
              <Select
                label="Advance / Update Request Status"
                name="toStatus"
                defaultValue={allowedNext[0]}
                options={allowedNext.map((s) => ({ value: s, label: statusLabel(s) }))}
              />
              <Input
                label="Reason / Audit Note"
                name="reason"
                placeholder="Record reason for status transition..."
              />
              <SubmitButton size="md">
                Save Status Change
              </SubmitButton>
            </form>
          )}
        </Card>

        {/* Applications for this Request */}
        <Card>
          <CardHeader>
            <CardTitle>
              Applicant Submissions for this Request ({request.applications.length})
            </CardTitle>
          </CardHeader>

          {request.applications.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)] py-4 text-center">
              No applicants have applied to this request yet.
            </p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {request.applications.map((app) => {
                const nextAppStatuses = nextStatuses("Application", app.status);
                return (
                  <div key={app.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm text-[var(--color-foreground)]">
                          {app.applicant.user.firstName} {app.applicant.user.lastName}
                          <span className="font-normal text-xs text-[var(--color-muted-foreground)] ml-2">
                            ({app.applicant.user.email})
                          </span>
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {app.applicant.preferredRole ?? "Applicant"} • Availability:{" "}
                          {app.applicant.availability ?? "Not specified"}
                        </p>
                      </div>
                      <Badge variant="status" status={app.status}>
                        {statusLabel(app.status)}
                      </Badge>
                    </div>

                    {app.coverLetter && (
                      <p className="text-xs text-[var(--color-secondary)] pl-3 border-l-2 border-[var(--color-border)]">
                        {app.coverLetter}
                      </p>
                    )}

                    {nextAppStatuses.length > 0 && (
                      <form
                        action={updateApplicationStatus}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
                      >
                        <input type="hidden" name="applicationId" value={app.id} />
                        <input type="hidden" name="fromStatus" value={app.status} />
                        <input
                          type="hidden"
                          name="returnTo"
                          value={`/admin/requests/${request.id}`}
                        />
                        <Select
                          label="Move Application To"
                          name="toStatus"
                          defaultValue={nextAppStatuses[0]}
                          options={nextAppStatuses.map((s) => ({
                            value: s,
                            label: statusLabel(s),
                          }))}
                        />
                        <Input
                          label="Reviewer Note"
                          name="reason"
                          placeholder="Add screening or interview note..."
                        />
                        <SubmitButton size="sm">
                          Update Application
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Controlled Candidate Sharing with Employer (FR-007, FR-022) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-4.5 w-4.5 text-[var(--color-accent)]" aria-hidden="true" />
              Share Sanitized Candidate Profile with {request.organization.name}
            </CardTitle>
          </CardHeader>

          <form action={shareCandidateWithEmployer} className="space-y-4">
            <input type="hidden" name="requestId" value={request.id} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Select Candidate (applicants for this request listed first)"
                name="applicantId"
                required
                options={sortedApplicants.map((a) => {
                  const app = applicationByApplicantId.get(a.id);
                  const prefix = app ? `★ Applied (${statusLabel(app.status)}) — ` : "";
                  return {
                    value: a.id,
                    label: `${prefix}${a.user.firstName} ${a.user.lastName} — ${
                      a.preferredRole ?? a.user.email
                    }`,
                  };
                })}
              />
              <div className="space-y-2 pt-1">
                <span className="block text-xs font-medium text-[var(--color-foreground)]">
                  Fields to Expose to Employer (Private contact info is withheld by default):
                </span>
                <div className="flex flex-wrap gap-4 text-xs text-[var(--color-secondary)]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" name="includeSkills" defaultChecked className="accent-[var(--color-primary)]" /> Skills
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" name="includeExperience" defaultChecked className="accent-[var(--color-primary)]" /> Experience
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" name="includeQualifications" defaultChecked className="accent-[var(--color-primary)]" /> Qualifications
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" name="includeAvailability" defaultChecked className="accent-[var(--color-primary)]" /> Availability
                  </label>
                </div>
              </div>
            </div>

            <Textarea
              label="Curated Agency Summary for Client Review"
              name="summaryNote"
              required
              placeholder="Summarize why this candidate is recommended for this engagement..."
            />

            <SubmitButton size="sm">
              Share Candidate with Employer
            </SubmitButton>
          </form>

          {request.candidateShares.length > 0 && (
            <div className="mt-6 pt-5 border-t border-[var(--color-border)] space-y-2">
              <h4 className="text-xs font-medium text-[var(--color-muted-foreground)]">
                Shared Candidates &amp; Employer Responses ({request.candidateShares.length})
              </h4>
              {request.candidateShares.map((cs) => (
                <div
                  key={cs.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-xs py-2 border-b last:border-0 border-[var(--color-border)]"
                >
                  <span>
                    <strong className="font-medium text-[var(--color-foreground)]">
                      {cs.applicant.user.firstName} {cs.applicant.user.lastName}
                    </strong>{" "}
                    (shared by {cs.sharedBy.firstName} on {formatDateTime(cs.createdAt)})
                  </span>
                  <Badge
                    variant="status"
                    status={cs.response ? "APPROVED" : "UNDER_REVIEW"}
                  >
                    {cs.response ?? "Pending Employer Review"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Status History */}
        <Card>
          <CardHeader>
            <CardTitle>Timestamped Change History</CardTitle>
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
                  <span className="inline-flex items-center gap-1.5 text-[var(--color-foreground)]">
                    <Clock className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" aria-hidden="true" />
                    {sc.fromStatus ? `${statusLabel(sc.fromStatus)} → ` : ""}
                    <strong className="font-medium">{statusLabel(sc.toStatus)}</strong>
                    {sc.reason ? ` — "${sc.reason}"` : ""}
                  </span>
                  <span className="text-[var(--color-muted-foreground)]">
                    {sc.changedBy.firstName} {sc.changedBy.lastName} •{" "}
                    {formatDateTime(sc.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
