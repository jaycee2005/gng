import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminHeader } from "@/components/layouts/admin-layout";
import { Card, Badge } from "@/components/ui/common";
import { parseJsonArray } from "@/lib/validation";
import { formatDate } from "@/lib/utils";

export default async function AdminApplicantsPage() {
  await requirePermission("applications:read");

  const applicants = await prisma.applicantProfile.findMany({
    include: {
      user: { include: { smsConsent: true } },
      _count: { select: { applications: true, assignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="pb-12">
      <AdminHeader title="Applicant Directory" />

      <div className="p-4 sm:p-6 grid grid-cols-1 gap-4">
        {applicants.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--color-muted-foreground)] py-8 text-center">
              No registered applicants found.
            </p>
          </Card>
        ) : (
          applicants.map((a) => {
            const skills = parseJsonArray(a.skills);
            const qualifications = parseJsonArray(a.qualifications);
            const consentStatus = a.user.smsConsent?.consentStatus ?? "OPTED_OUT";

            return (
              <Card key={a.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-medium text-[var(--color-foreground)]">
                      {a.user.firstName} {a.user.lastName}
                      {a.preferredRole ? (
                        <span className="text-sm font-normal text-[var(--color-accent)] ml-2">
                          — {a.preferredRole}
                        </span>
                      ) : null}
                    </h3>
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                      {a.user.email} • Phone: {a.user.phone ?? "Not provided"} • Availability:{" "}
                      {a.availability ?? "Flexible"} • Joined {formatDate(a.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="status" status={consentStatus}>
                      SMS: {consentStatus}
                    </Badge>
                    <Badge>
                      {a._count.applications} apps / {a._count.assignments} assignments
                    </Badge>
                  </div>
                </div>

                {a.summary && (
                  <p className="text-sm text-[var(--color-secondary)] prose-constrained leading-relaxed">
                    {a.summary}
                  </p>
                )}

                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="text-xs px-2.5 py-0.5 rounded-md bg-[var(--color-muted)] text-[var(--color-secondary)] font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {qualifications.length > 0 && (
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    <strong className="font-medium text-[var(--color-foreground)]">
                      Qualifications:
                    </strong>{" "}
                    {qualifications.join(" • ")}
                  </p>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
