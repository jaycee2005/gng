import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotificationRule, toggleNotificationRule } from "@/app/actions/admin";
import { AdminHeader } from "@/components/layouts/admin-layout";
import { Card, CardHeader, CardTitle, Badge } from "@/components/ui/common";
import { Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { EVENT_TYPES, RECIPIENT_ROLES } from "@/lib/dispatch";
import { Bell, PlusCircle, ArrowLeft } from "lucide-react";

export default async function AdminNotificationRulesPage() {
  await requirePermission("settings:write");

  const [rules, templates] = await Promise.all([
    prisma.notificationRule.findMany({
      include: {
        template: true,
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.notificationTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="pb-12">
      <AdminHeader
        title="Dispatch Notification Rules"
        actions={
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Settings
          </Link>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-4.5 w-4.5 text-[var(--color-accent)]" aria-hidden="true" />
              Create Event-to-Recipient Notification Rule
            </CardTitle>
          </CardHeader>

          <form action={createNotificationRule} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="Rule Name"
                name="name"
                required
                placeholder="Notify Staff on New Request"
              />
              <Select
                label="Workflow Event"
                name="eventType"
                options={EVENT_TYPES.map((e) => ({ value: e.value, label: e.label }))}
              />
              <Select
                label="Recipient Role"
                name="recipientRole"
                options={RECIPIENT_ROLES.map((r) => ({
                  value: r,
                  label: r.charAt(0).toUpperCase() + r.slice(1),
                }))}
              />
              <Select
                label="Approved Message Template"
                name="templateId"
                options={templates.map((t) => ({
                  value: t.id,
                  label: `${t.name} (v${t.version})`,
                }))}
              />
            </div>
            <SubmitButton size="sm">
              Create Rule
            </SubmitButton>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-[var(--color-accent)]" aria-hidden="true" />
              Configured Notification Rules ({rules.length})
            </CardTitle>
          </CardHeader>

          {rules.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)] py-6 text-center">
              No notification rules configured yet.
            </p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-[var(--color-foreground)]">
                        {r.name}
                      </h3>
                      <Badge variant="status" status={r.isEnabled ? "ACTIVE" : "DISABLED"}>
                        {r.isEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Event: <code>{r.eventType}</code> → Recipient Role:{" "}
                      <strong className="font-medium text-[var(--color-foreground)]">{r.recipientRole}</strong> • Template:{" "}
                      <em>{r.template.name}</em> (v{r.template.version}) •{" "}
                      {r._count.deliveries} historical deliveries
                    </p>
                    <p className="text-xs text-[var(--color-secondary)] font-mono pl-3 border-l-2 border-[var(--color-border)]">
                      {r.template.body}
                    </p>
                  </div>

                  <form action={toggleNotificationRule}>
                    <input type="hidden" name="ruleId" value={r.id} />
                    <input
                      type="hidden"
                      name="isEnabled"
                      value={r.isEnabled ? "false" : "true"}
                    />
                    <SubmitButton
                      
                      variant={r.isEnabled ? "outline" : "primary"}
                      size="sm"
                    >
                      {r.isEnabled ? "Disable Rule" : "Enable Rule"}
                    </SubmitButton>
                  </form>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
