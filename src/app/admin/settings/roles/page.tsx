import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  updateRolePermissions,
  createStaffAccount,
  updateUserAccountStatus,
} from "@/app/actions/admin";
import { AdminHeader } from "@/components/layouts/admin-layout";
import { Card, CardHeader, CardTitle, Badge } from "@/components/ui/common";
import { Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Shield, UserPlus, ArrowLeft } from "lucide-react";

export default async function AdminRolesSettingsPage() {
  const currentUser = await requirePermission("users:manage");

  const [roles, permissions, users] = await Promise.all([
    prisma.role.findMany({
      where: { portal: "ADMIN" },
      include: { permissions: true },
      orderBy: { name: "asc" },
    }),
    prisma.permission.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="pb-12">
      <AdminHeader
        title="Roles, Permissions &amp; User Access Control"
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
        {/* Role Permission Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {roles.map((role) => {
            const granted = new Set(role.permissions.map((rp) => rp.permissionId));
            return (
              <Card key={role.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4.5 w-4.5 text-[var(--color-accent)]" aria-hidden="true" />
                    Role: {role.name}
                  </CardTitle>
                  <Badge>{role.portal} Portal</Badge>
                </CardHeader>
                <p className="text-xs text-[var(--color-muted-foreground)] mb-4">
                  {role.description}
                </p>

                <form action={updateRolePermissions} className="space-y-4">
                  <input type="hidden" name="roleId" value={role.id} />
                  <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)] max-h-72 overflow-y-auto pr-1">
                    {permissions.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-start gap-2.5 text-xs py-2.5 px-1 hover:bg-[var(--color-muted)]/40 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          name="permissionIds"
                          value={perm.id}
                          defaultChecked={granted.has(perm.id)}
                          className="mt-0.5 h-4 w-4 rounded accent-[var(--color-primary)]"
                        />
                        <div>
                          <span className="font-medium text-[var(--color-foreground)] block">
                            <code>{perm.name}</code>
                          </span>
                          <span className="text-[var(--color-muted-foreground)]">
                            {perm.description}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                  <SubmitButton size="sm">
                    Save {role.name} Permissions
                  </SubmitButton>
                </form>
              </Card>
            );
          })}
        </div>

        {/* Provision New Staff Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-4.5 w-4.5 text-[var(--color-accent)]" aria-hidden="true" />
              Create Staff or Administrator Account
            </CardTitle>
          </CardHeader>

          <form action={createStaffAccount} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="First Name" name="firstName" required placeholder="Jordan" />
              <Input label="Last Name" name="lastName" required placeholder="Lee" />
              <Select
                label="Assigned Role"
                name="roleId"
                required
                options={roles.map((r) => ({ value: r.id, label: r.name }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Email Address"
                name="email"
                type="email"
                required
                placeholder="jordan@ggmanpower.com"
              />
              <Input
                label="Temporary Password"
                name="password"
                type="password"
                required
                placeholder="Minimum 8 chars"
              />
              <Input
                label="Phone Number (PH / E.164)"
                name="phone"
                placeholder="09171234567 or +639171234567"
              />
            </div>
            <SubmitButton size="sm">
              Create Staff Account
            </SubmitButton>
          </form>
        </Card>

        {/* Manage User Account Status (Active / Disabled / Suspended) */}
        <Card>
          <CardHeader>
            <CardTitle>All User Accounts ({users.length})</CardTitle>
          </CardHeader>
          <div className="divide-y divide-[var(--color-border)]">
            {users.map((u) => {
              const isSelf = u.id === currentUser.id;
              return (
                <div
                  key={u.id}
                  className="py-3 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">
                      {u.firstName} {u.lastName}{" "}
                      <span className="text-xs font-normal text-[var(--color-muted-foreground)]">
                        ({u.email})
                      </span>
                      {isSelf && (
                        <span className="ml-2 text-[11px] font-medium px-2 py-0.5 rounded bg-[var(--color-muted)] text-[var(--color-secondary)]">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Roles: {u.roles.map((r) => r.role.name).join(", ")}
                    </p>
                  </div>

                  <form
                    action={updateUserAccountStatus}
                    className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center gap-2"
                  >
                    <input type="hidden" name="userId" value={u.id} />
                    <Badge variant="status" status={u.accountStatus}>
                      {u.accountStatus}
                    </Badge>
                    <Select
                      name="accountStatus"
                      aria-label={`Account status for ${u.firstName} ${u.lastName}`}
                      defaultValue={u.accountStatus}
                      disabled={isSelf}
                      options={[
                        { value: "ACTIVE", label: "Active" },
                        { value: "DISABLED", label: "Disabled" },
                        { value: "SUSPENDED", label: "Suspended" },
                      ]}
                    />
                    <SubmitButton
                      variant="outline"
                      size="sm"
                      disabled={isSelf}
                      title={isSelf ? "You cannot disable your own active administrator account" : undefined}
                    >
                      Update
                    </SubmitButton>
                  </form>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
