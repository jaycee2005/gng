import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { Flash } from "@/components/ui/flash";

export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("ADMIN");

  return (
    <AdminLayout
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      }}
    >
      <div className="px-4 sm:px-6 pt-3 empty:hidden">
        <Suspense fallback={null}>
          <Flash />
        </Suspense>
      </div>
      {children}
    </AdminLayout>
  );
}
