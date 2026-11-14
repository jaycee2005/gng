import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AdminHeader } from "@/components/layouts/admin-layout";
import { Card } from "@/components/ui/common";
import { Shield, Bell, FileText, ArrowRight } from "lucide-react";

export default async function AdminSettingsIndexPage() {
  await requireUser("ADMIN");

  return (
    <div className="pb-12">
      <AdminHeader title="Administration &amp; System Configuration" />

      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <Card className="flex flex-col justify-between space-y-5">
          <div>
            <div
              className="w-9 h-9 rounded-md bg-[var(--color-muted)] text-[var(--color-secondary)] flex items-center justify-center mb-3.5"
              aria-hidden="true"
            >
              <Shield className="h-4.5 w-4.5" />
            </div>
            <h2 className="font-display text-base sm:text-lg font-medium text-[var(--color-foreground)]">
              Roles, Permissions &amp; Accounts
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1.5 leading-relaxed">
              Configure granular permissions for ADMIN and STAFF roles, provision staff accounts, or suspend and disable user access.
            </p>
          </div>
          <Link
            href="/admin/settings/roles"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:underline pt-2 border-t border-[var(--color-border)]"
          >
            Manage Roles &amp; Users <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Card>

        <Card className="flex flex-col justify-between space-y-5">
          <div>
            <div
              className="w-9 h-9 rounded-md bg-[var(--color-muted)] text-[var(--color-secondary)] flex items-center justify-center mb-3.5"
              aria-hidden="true"
            >
              <Bell className="h-4.5 w-4.5" />
            </div>
            <h2 className="font-display text-base sm:text-lg font-medium text-[var(--color-foreground)]">
              Dispatch Notification Rules
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1.5 leading-relaxed">
              Map workflow events to recipient roles and approved templates, or enable and disable rules without altering historical logs.
            </p>
          </div>
          <Link
            href="/admin/settings/notifications"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:underline pt-2 border-t border-[var(--color-border)]"
          >
            Configure Rules <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Card>

        <Card className="flex flex-col justify-between space-y-5">
          <div>
            <div
              className="w-9 h-9 rounded-md bg-[var(--color-muted)] text-[var(--color-secondary)] flex items-center justify-center mb-3.5"
              aria-hidden="true"
            >
              <FileText className="h-4.5 w-4.5" />
            </div>
            <h2 className="font-display text-base sm:text-lg font-medium text-[var(--color-foreground)]">
              SMS Message Templates
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1.5 leading-relaxed">
              Create and version-control SMS templates with strict placeholder validation and portal authentication links.
            </p>
          </div>
          <Link
            href="/admin/settings/templates"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:underline pt-2 border-t border-[var(--color-border)]"
          >
            Edit Templates <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Card>
      </div>
    </div>
  );
}
