import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminHeader } from "@/components/layouts/admin-layout";
import { Card } from "@/components/ui/common";
import { FilterPills } from "@/components/ui/filter-pills";
import { formatDateTime } from "@/lib/utils";

const AUDIT_RESOURCES = [
  { value: "auth", label: "Authentication" },
  { value: "request", label: "Requests" },
  { value: "application", label: "Applications" },
  { value: "assignment", label: "Assignments" },
  { value: "candidate_share", label: "Candidate Shares" },
  { value: "user", label: "User Accounts" },
] as const;

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ resource?: string }>;
}) {
  await requirePermission("audit:read");
  const { resource } = await searchParams;
  const resourceFilter = AUDIT_RESOURCES.find((r) => r.value === resource)?.value;

  const events = await prisma.auditEvent.findMany({
    where: resourceFilter ? { resource: resourceFilter } : undefined,
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  return (
    <div className="pb-12">
      <AdminHeader title="Security &amp; Operational Audit Trail" />

      <div className="p-4 sm:p-6">
        <Card padding="none">
          <div className="p-4 sm:p-6 border-b border-[var(--color-border)] space-y-3">
            <div>
              <h2 className="font-display text-base sm:text-lg font-medium text-[var(--color-foreground)]">
                Audit Events ({events.length})
              </h2>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                Records authentication events, permission denials, candidate sharing decisions, status transitions, and configuration changes (FR-020).
              </p>
            </div>
            <FilterPills
              basePath="/admin/audit"
              paramName="resource"
              current={resourceFilter}
              options={AUDIT_RESOURCES.map((r) => ({ value: r.value, label: r.label }))}
            />
          </div>

          {events.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)] py-8 text-center">
              No audit events recorded yet.
            </p>
          ) : (
            <>
              {/* Mobile Stacked Card List (< md) */}
              <div className="md:hidden divide-y divide-[var(--color-border)]">
                {events.map((ev) => (
                  <div key={ev.id} className="p-4 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <code className="font-medium text-[var(--color-primary)]">{ev.action}</code>
                      <span className="text-[var(--color-muted-foreground)]">
                        {formatDateTime(ev.createdAt)}
                      </span>
                    </div>
                    <p className="text-[var(--color-foreground)]">
                      {ev.user
                        ? `${ev.user.firstName} ${ev.user.lastName} (${ev.user.email})`
                        : "System / Unauthenticated"}
                    </p>
                    <p className="text-[var(--color-secondary)]">
                      Resource:{" "}
                      <strong className="font-medium text-[var(--color-foreground)]">
                        {ev.resource}
                      </strong>
                      {ev.resourceId ? ` (${ev.resourceId.slice(0, 10)}…)` : ""}
                    </p>
                    {ev.details && (
                      <p className="font-mono text-[11px] text-[var(--color-muted-foreground)] break-all pl-3 border-l-2 border-[var(--color-border)]">
                        {ev.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Tablet / Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50 text-left text-xs font-medium text-[var(--color-muted-foreground)]">
                      <th scope="col" className="px-4 py-3">Timestamp</th>
                      <th scope="col" className="px-4 py-3">Actor</th>
                      <th scope="col" className="px-4 py-3">Action</th>
                      <th scope="col" className="px-4 py-3">Resource</th>
                      <th scope="col" className="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {events.map((ev) => (
                      <tr key={ev.id} className="hover:bg-[var(--color-muted)]/30">
                        <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)] whitespace-nowrap">
                          {formatDateTime(ev.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-foreground)]">
                          {ev.user
                            ? `${ev.user.firstName} ${ev.user.lastName} (${ev.user.email})`
                            : "System / Unauthenticated"}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-[var(--color-primary)]">
                          <code>{ev.action}</code>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-secondary)]">
                          {ev.resource}
                          {ev.resourceId ? ` (${ev.resourceId.slice(0, 10)}…)` : ""}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)] font-mono break-all">
                          {ev.details ?? "—"}
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
