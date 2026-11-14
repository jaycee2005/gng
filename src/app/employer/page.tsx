import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, KpiCard, Badge } from "@/components/ui/common";
import { statusLabel } from "@/lib/workflow";
import { formatDate } from "@/lib/utils";
import { FileText, Users, CheckCircle2, Send, ArrowRight } from "lucide-react";

export default async function EmployerDashboardPage() {
  const user = await requireUser("EMPLOYER");
  const contact = await prisma.employerContact.findUnique({
    where: { userId: user.id },
    include: { organization: true },
  });

  if (!contact) {
    return (
      <Card>
        <p className="text-sm text-[var(--color-destructive)]">
          Your account is not linked to an employer organization. Please contact agency staff.
        </p>
      </Card>
    );
  }

  const [requests, shares, assignments] = await Promise.all([
    prisma.employerRequest.findMany({
      where: { organizationId: contact.organizationId },
      include: {
        _count: { select: { candidateShares: true, assignments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.candidateShare.findMany({
      where: { request: { organizationId: contact.organizationId } },
      include: { request: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.assignment.findMany({
      where: { request: { organizationId: contact.organizationId } },
      include: { request: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const activeRequests = requests.filter(
    (r) => !["CANCELLED", "CLOSED", "FILLED"].includes(r.status)
  );
  const pendingReviewShares = shares.filter((s) => !s.response);

  return (
    <div className="space-y-6">
      {/* Calm Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--color-border)]">
        <div>
          <h1 className="font-display text-2xl font-normal text-[var(--color-foreground)]">
            {contact.organization.name}
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
            Submit manpower requests, review vetted candidate profiles, and monitor dispatched workers.
          </p>
        </div>
        <Link
          href="/employer/requests"
          className="inline-flex items-center gap-2 min-h-10 px-4 rounded-md bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors self-start sm:self-auto"
        >
          New Manpower Request
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Active Requests"
          value={activeRequests.length}
          change={`${requests.length} total submitted`}
          href="/employer/requests"
          icon={<FileText className="h-4.5 w-4.5" />}
        />
        <KpiCard
          title="Shared Candidates"
          value={shares.length}
          change={`${pendingReviewShares.length} awaiting your response`}
          changeType={pendingReviewShares.length > 0 ? "positive" : "neutral"}
          href="/employer/candidates"
          icon={<Users className="h-4.5 w-4.5" />}
        />
        <KpiCard
          title="Dispatched Workers"
          value={assignments.filter((a) => ["DISPATCHED", "ACTIVE"].includes(a.status)).length}
          change={`${assignments.length} total placements`}
          href="/employer/requests"
          icon={<Send className="h-4.5 w-4.5" />}
        />
        <KpiCard
          title="Filled Requests"
          value={requests.filter((r) => r.status === "FILLED").length}
          change="Completed placements"
          href="/employer/requests"
          icon={<CheckCircle2 className="h-4.5 w-4.5" />}
        />
      </div>

      {/* Pending Candidate Dossiers Awaiting Review */}
      {pendingReviewShares.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Candidate Dossiers Awaiting Your Review ({pendingReviewShares.length})</CardTitle>
            <Link
              href="/employer/candidates"
              className="text-xs font-medium text-[var(--color-accent)] hover:underline"
            >
              Review dossiers →
            </Link>
          </CardHeader>
          <div className="divide-y divide-[var(--color-border)]">
            {pendingReviewShares.slice(0, 4).map((share) => (
              <div
                key={share.id}
                className="py-3 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-sm text-[var(--color-foreground)]">
                    Job Order: {share.request.title}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Shared {formatDate(share.createdAt)} • Vetted candidate profile ready for evaluation
                  </p>
                </div>
                <Link
                  href="/employer/candidates"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:underline"
                >
                  Evaluate candidate →
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Organization Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Your Organization&apos;s Requests</CardTitle>
          <Link
            href="/employer/requests"
            className="text-xs font-medium text-[var(--color-accent)] hover:underline"
          >
            Manage requests →
          </Link>
        </CardHeader>

        {requests.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)] py-6 text-center">
            No requests submitted yet. Create your first staffing request on the Requests page.
          </p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {requests.map((req) => (
              <div
                key={req.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <Link
                    href={`/employer/requests/${req.id}`}
                    className="font-medium text-sm text-[var(--color-foreground)] hover:text-[var(--color-accent)] hover:underline"
                  >
                    {req.title}
                  </Link>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                    {req.positions} position(s) • {req._count.candidateShares} shared candidate(s) •{" "}
                    {req._count.assignments} assignment(s) • Submitted {formatDate(req.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="status" status={req.urgency}>
                    {req.urgency}
                  </Badge>
                  <Badge variant="status" status={req.status}>
                    {statusLabel(req.status)}
                  </Badge>
                  <Link
                    href={`/employer/requests/${req.id}`}
                    className="text-xs font-medium text-[var(--color-accent)] hover:underline ml-2"
                  >
                    Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
