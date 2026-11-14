import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createEmployerOrganizationAdmin } from "@/app/actions/admin";
import { AdminHeader } from "@/components/layouts/admin-layout";
import { Card, Badge, CollapsibleCard } from "@/components/ui/common";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/utils";
import { Building2 } from "lucide-react";

export default async function AdminEmployersPage() {
  await requirePermission("requests:read");

  const organizations = await prisma.employerOrganization.findMany({
    include: {
      contacts: { include: { user: true } },
      _count: { select: { requests: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="pb-12">
      <AdminHeader title="Employer Client Organizations" />

      <div className="p-4 sm:p-6 space-y-6">
        <CollapsibleCard
          title="Add Client Organization"
          subtitle="Register a new partner employer organization in the directory"
          actionLabel="+ Add Organization"
          defaultOpen={organizations.length === 0}
        >
          <form action={createEmployerOrganizationAdmin} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Organization Name" name="name" required placeholder="Laguna Logistics Corp." />
              <Input label="Industry" name="industry" placeholder="Manufacturing &amp; Logistics" />
              <Input label="Phone (PH / E.164)" name="phone" placeholder="09171234567 or +639171234567" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Website" name="website" placeholder="https://vertex.example.com" />
              <Input label="Address" name="address" placeholder="Ayala Ave, Makati City, Metro Manila" />
            </div>
            <SubmitButton size="sm">
              Add Organization
            </SubmitButton>
          </form>
        </CollapsibleCard>

        {organizations.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--color-muted-foreground)] py-8 text-center">
              No client organizations registered yet.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {organizations.map((org) => (
              <Card key={org.id} className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-md bg-[var(--color-muted)] flex items-center justify-center text-[var(--color-secondary)]"
                      aria-hidden="true"
                    >
                      <Building2 className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="font-display font-medium text-base text-[var(--color-foreground)]">
                        {org.name}
                      </h3>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {org.industry ?? "Client Organization"} • Added {formatDate(org.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Badge>{org._count.requests} request(s)</Badge>
                </div>

                {org.address && (
                  <p className="text-xs text-[var(--color-secondary)]">{org.address}</p>
                )}

                <div className="pt-2.5 border-t border-[var(--color-border)]">
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)] mb-1">
                    Authorized Contacts ({org.contacts.length}):
                  </p>
                  {org.contacts.length === 0 ? (
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      No contacts linked.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-xs text-[var(--color-secondary)]">
                      {org.contacts.map((c) => (
                        <li key={c.id}>
                          <strong className="font-medium text-[var(--color-foreground)]">
                            {c.user.firstName} {c.user.lastName}
                          </strong>{" "}
                          ({c.jobTitle ?? "Contact"}) — {c.user.email}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
