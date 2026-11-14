import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createEmployerRequest } from "@/app/actions/employer";
import { Card, CardHeader, CardTitle, Badge, CollapsibleCard } from "@/components/ui/common";
import { Input, Textarea, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { statusLabel } from "@/lib/workflow";
import { formatDate } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export default async function EmployerRequestsPage() {
  const user = await requireUser("EMPLOYER");
  const contact = await prisma.employerContact.findUnique({
    where: { userId: user.id },
    include: { organization: true },
  });

  const requests = contact
    ? await prisma.employerRequest.findMany({
        where: { organizationId: contact.organizationId },
        include: {
          _count: { select: { candidateShares: true, assignments: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-[var(--color-border)]">
        <h1 className="font-display text-2xl font-normal text-[var(--color-foreground)]">
          Manpower Requests
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          Submit new staffing requirements and monitor fulfillment status for{" "}
          {contact?.organization.name ?? "your organization"}.
        </p>
      </div>

      {/* Submit New Request Form */}
      <CollapsibleCard
        title="Submit a New Manpower Request"
        subtitle="Specify role requirements, headcount, and urgency for agency dispatch"
        actionLabel="+ New Request"
        defaultOpen={requests.length === 0}
      >
        <form action={createEmployerRequest} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Job Order / Role Title"
                name="title"
                required
                placeholder="e.g. Warehouse Associates & Forklift Operators"
              />
            </div>
            <Select
              label="Urgency"
              name="urgency"
              defaultValue="NORMAL"
              options={[
                { value: "LOW", label: "Low" },
                { value: "NORMAL", label: "Normal" },
                { value: "HIGH", label: "High" },
                { value: "URGENT", label: "Urgent" },
              ]}
            />
          </div>

          <Textarea
            label="Job Scope &amp; Site Requirements"
            name="description"
            required
            placeholder="Describe duties, work location, shift schedule, and reporting supervisor..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Positions Needed"
              name="positions"
              type="number"
              min={1}
              max={100}
              required
              defaultValue={1}
            />
            <Input label="Target Start Date" name="startDate" type="date" />
            <Input label="Target End Date" name="endDate" type="date" />
          </div>

          <Input
            label="Required Skills / Certifications (comma-separated)"
            name="requirements"
            placeholder="TESDA NC II, Forklift License, 1+ year warehouse experience"
          />

          <SubmitButton>Submit Request</SubmitButton>
        </form>
      </CollapsibleCard>

      {/* Existing Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Submitted Requests ({requests.length})</CardTitle>
        </CardHeader>

        {requests.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)] py-6 text-center">
            No requests submitted yet.
          </p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {requests.map((req) => (
              <div
                key={req.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <Link
                    href={`/employer/requests/${req.id}`}
                    className="text-base font-medium text-[var(--color-foreground)] hover:text-[var(--color-accent)] hover:underline"
                  >
                    {req.title}
                  </Link>
                  <p className="text-xs text-[var(--color-muted-foreground)] tabular-nums">
                    Positions: {req.positions} • Shared Candidates: {req._count.candidateShares} •{" "}
                    Assignments: {req._count.assignments} • Created: {formatDate(req.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <Badge variant="status" status={req.urgency}>
                    {req.urgency}
                  </Badge>
                  <Badge variant="status" status={req.status}>
                    {statusLabel(req.status)}
                  </Badge>
                  <Link
                    href={`/employer/requests/${req.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline"
                  >
                    Open <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
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
