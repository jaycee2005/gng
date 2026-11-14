import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateApplicationStatus } from "@/app/actions/admin";
import { AdminHeader } from "@/components/layouts/admin-layout";
import { Card, Badge } from "@/components/ui/common";
import { Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { nextStatuses, statusLabel } from "@/lib/workflow";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Clock } from "lucide-react";

export default async function AdminApplicationsPage() {
  await requirePermission("applications:read");

  const applications = await prisma.application.findMany({
    include: {
      applicant: { include: { user: true } },
      request: { include: { organization: true } },
      statusChanges: {
        include: { changedBy: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="pb-12">
      <AdminHeader title="Recruitment &amp; Application Pipeline" />

      <div className="p-4 sm:p-6 space-y-4">
        {applications.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--color-muted-foreground)] py-8 text-center">
              No candidate applications submitted yet.
            </p>
          </Card>
        ) : (
          applications.map((app) => {
            const allowed = nextStatuses("Application", app.status);
            return (
              <Card key={app.id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-medium text-[var(--color-foreground)]">
                      {app.applicant.user.firstName} {app.applicant.user.lastName}{" "}
                      <span className="text-xs font-normal text-[var(--color-muted-foreground)]">
                        ({app.applicant.user.email})
                      </span>
                    </h3>
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                      Applied for{" "}
                      <Link
                        href={`/admin/requests/${app.requestId}`}
                        className="font-medium text-[var(--color-accent)] hover:underline"
                      >
                        {app.request.title}
                      </Link>{" "}
                      ({app.request.organization.name}) on {formatDate(app.createdAt)}
                    </p>
                  </div>
                  <Badge variant="status" status={app.status}>
                    {statusLabel(app.status)}
                  </Badge>
                </div>

                {app.coverLetter && (
                  <p className="text-xs text-[var(--color-secondary)] pl-3 border-l-2 border-[var(--color-border)] leading-relaxed">
                    {app.coverLetter}
                  </p>
                )}

                {allowed.length > 0 && (
                  <form
                    action={updateApplicationStatus}
                    className="pt-3 border-t border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
                  >
                    <input type="hidden" name="applicationId" value={app.id} />
                    <input type="hidden" name="fromStatus" value={app.status} />
                    <input type="hidden" name="returnTo" value="/admin/applications" />
                    <Select
                      label="Advance Status To"
                      name="toStatus"
                      defaultValue={allowed[0]}
                      options={allowed.map((s) => ({ value: s, label: statusLabel(s) }))}
                    />
                    <Input
                      label="Decision Note (logged to history)"
                      name="reason"
                      placeholder="Record screening or interview decision..."
                    />
                    <SubmitButton size="sm">
                      Save &amp; Notify
                    </SubmitButton>
                  </form>
                )}

                {app.statusChanges.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs text-[var(--color-muted-foreground)]">
                    {app.statusChanges.map((sc) => (
                      <span
                        key={sc.id}
                        className="inline-flex items-center gap-1 bg-[var(--color-muted)] px-2.5 py-1 rounded-md"
                      >
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {sc.fromStatus ? `${statusLabel(sc.fromStatus)} → ` : ""}
                        <strong className="font-medium text-[var(--color-foreground)]">
                          {statusLabel(sc.toStatus)}
                        </strong>{" "}
                        by {sc.changedBy.firstName} ({formatDateTime(sc.createdAt)})
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
