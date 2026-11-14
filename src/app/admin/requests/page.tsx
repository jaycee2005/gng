import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffCreateRequest } from "@/app/actions/admin";
import { AdminHeader } from "@/components/layouts/admin-layout";
import { Card, Badge, CollapsibleCard } from "@/components/ui/common";
import { FilterPills } from "@/components/ui/filter-pills";
import { Input, Textarea, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { statusLabel } from "@/lib/workflow";
import { formatDate } from "@/lib/utils";
import { ArrowRight, PlusCircle } from "lucide-react";

const REQUEST_FILTERS = ["SUBMITTED", "APPROVED", "IN_PROGRESS", "FILLED", "CANCELLED"] as const;

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission("requests:read");
  const { status } = await searchParams;
  const statusFilter = REQUEST_FILTERS.find((s) => s === status);

  const [requests, organizations] = await Promise.all([
    prisma.employerRequest.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      include: {
        organization: true,
        _count: { select: { applications: true, candidateShares: true, assignments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employerOrganization.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="pb-12">
      <AdminHeader title="Employer Requests Management" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Record New Employer Request */}
        <CollapsibleCard
          title="Record Employer Manpower Request"
          actionLabel="+ New Request"
          defaultOpen={requests.length === 0 && !statusFilter}
          icon={<PlusCircle className="h-4.5 w-4.5 text-[var(--color-accent)] flex-shrink-0" aria-hidden="true" />}
        >
          <form action={staffCreateRequest} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Select
                label="Employer Organization"
                name="organizationId"
                required
                options={organizations.map((o) => ({ value: o.id, label: o.name }))}
              />
              <Input
                label="Request Title"
                name="title"
                required
                placeholder="e.g. Warehouse & Forklift Operators (5 Slots)"
              />
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
              placeholder="Detail work site, shift hours, required qualifications, and target timeline..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="Positions"
                name="positions"
                type="number"
                min={1}
                max={100}
                defaultValue={1}
                required
              />
              <Input label="Start Date" name="startDate" type="date" />
              <Input label="End Date" name="endDate" type="date" />
              <Input
                label="Requirements (comma-separated)"
                name="requirements"
                placeholder="TESDA NC II, Valid Driver's License, 1+ yr experience"
              />
            </div>

            <SubmitButton size="sm" className="w-full sm:w-auto">
              Record &amp; Approve Request
            </SubmitButton>
          </form>
        </CollapsibleCard>

        {/* All Requests — Responsive Mobile Cards + Desktop Table */}
        <Card padding="none">
          <div className="p-4 sm:p-6 border-b border-[var(--color-border)] space-y-3">
            <h2 className="font-display text-base sm:text-lg font-medium text-[var(--color-foreground)]">
              {statusFilter ? `${statusLabel(statusFilter)} Requests` : "All Employer Requests"} ({requests.length})
            </h2>
            <FilterPills
              basePath="/admin/requests"
              current={statusFilter}
              options={REQUEST_FILTERS.map((s) => ({ value: s, label: statusLabel(s) }))}
            />
          </div>

          {requests.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)] py-8 text-center">
              {statusFilter ? "No requests match this status." : "No employer requests recorded yet."}
            </p>
          ) : (
            <>
              {/* Mobile Stacked Card List (< md) */}
              <div className="md:hidden divide-y divide-[var(--color-border)]">
                {requests.map((r) => (
                  <div key={r.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/admin/requests/${r.id}`}
                          className="font-medium text-sm text-[var(--color-foreground)] hover:text-[var(--color-accent)] hover:underline"
                        >
                          {r.title}
                        </Link>
                        <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                          {r.organization.name} • {r.positions} position(s)
                        </p>
                      </div>
                      <Badge variant="status" status={r.status}>
                        {statusLabel(r.status)}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted-foreground)]">
                      <div className="flex items-center gap-2">
                        <Badge variant="status" status={r.urgency}>
                          {r.urgency}
                        </Badge>
                        <span>
                          {r._count.applications} apps • {r._count.candidateShares} shared •{" "}
                          {r._count.assignments} assigned
                        </span>
                      </div>
                      <Link
                        href={`/admin/requests/${r.id}`}
                        className="inline-flex items-center gap-1 font-medium text-[var(--color-accent)] hover:underline"
                      >
                        Open <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tablet / Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50 text-left text-xs font-medium text-[var(--color-muted-foreground)]">
                      <th scope="col" className="px-4 py-3">Request Title</th>
                      <th scope="col" className="px-4 py-3">Organization</th>
                      <th scope="col" className="px-4 py-3">Urgency</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="px-4 py-3">Pipeline</th>
                      <th scope="col" className="px-4 py-3">Created</th>
                      <th scope="col" className="px-4 py-3 text-right">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {requests.map((r) => (
                      <tr key={r.id} className="hover:bg-[var(--color-muted)]/30">
                        <td className="px-4 py-3 font-medium text-[var(--color-foreground)]">
                          <Link
                            href={`/admin/requests/${r.id}`}
                            className="hover:text-[var(--color-accent)] hover:underline"
                          >
                            {r.title}
                          </Link>
                          <span className="block text-xs font-normal text-[var(--color-muted-foreground)]">
                            {r.positions} position(s)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-secondary)]">
                          {r.organization.name}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="status" status={r.urgency}>
                            {r.urgency}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="status" status={r.status}>
                            {statusLabel(r.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)] tabular-nums">
                          {r._count.applications} apps • {r._count.candidateShares} shared •{" "}
                          {r._count.assignments} assigned
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                          {formatDate(r.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/requests/${r.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline"
                          >
                            Open <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
