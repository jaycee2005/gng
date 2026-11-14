import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { respondToCandidateShare } from "@/app/actions/employer";
import { Card, CardHeader, CardTitle, Badge } from "@/components/ui/common";
import { Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { EMPLOYER_RESPONSES } from "@/lib/workflow";
import { formatDateTime } from "@/lib/utils";

type SharedSnapshot = {
  candidateName?: string;
  preferredRole?: string | null;
  summaryNote?: string;
  skills?: string[];
  qualifications?: string[];
  availability?: string | null;
};

export default async function EmployerCandidatesPage() {
  const user = await requireUser("EMPLOYER");
  const contact = await prisma.employerContact.findUnique({
    where: { userId: user.id },
  });

  const shares = contact
    ? await prisma.candidateShare.findMany({
        where: { request: { organizationId: contact.organizationId } },
        include: { request: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-[var(--color-border)]">
        <h1 className="font-display text-2xl font-normal text-[var(--color-foreground)]">
          Shared Candidate Profiles
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          Review sanitized candidate profiles shared with your organization by G&amp;G Manpower staff and submit your feedback.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Candidates Shared with Your Organization ({shares.length})</CardTitle>
        </CardHeader>

        {shares.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)] py-6 text-center">
            No candidates have been shared with your organization yet.
          </p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {shares.map((share) => {
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
                        For Request:{" "}
                        <Link
                          href={`/employer/requests/${share.requestId}`}
                          className="text-[var(--color-accent)] hover:underline font-medium"
                        >
                          {share.request.title}
                        </Link>{" "}
                        • Shared {formatDateTime(share.createdAt)}
                      </p>
                    </div>
                    {share.response ? (
                      <Badge variant="status" status="APPROVED">
                        {share.response}
                      </Badge>
                    ) : (
                      <Badge variant="status" status="UNDER_REVIEW">
                        Awaiting Decision
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
                          <input type="hidden" name="returnTo" value="/employer/candidates" />
                          <Select
                            label="Response"
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
                            label="Updated Notes for Agency Staff"
                            name="note"
                            placeholder="Schedule interview or provide feedback..."
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
                      <input type="hidden" name="returnTo" value="/employer/candidates" />
                      <Select
                        label="Response"
                        name="decision"
                        defaultValue="INTERESTED"
                        options={EMPLOYER_RESPONSES.map((r) => ({ value: r.value, label: r.label }))}
                      />
                      <Input
                        label="Notes for Agency Staff"
                        name="note"
                        placeholder="Schedule interview or provide feedback..."
                      />
                      <SubmitButton size="md">Submit Response</SubmitButton>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
