import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmployerLayout } from "@/components/layouts/employer-layout";
import { Flash } from "@/components/ui/flash";

export default async function EmployerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("EMPLOYER");
  const contact = await prisma.employerContact.findUnique({
    where: { userId: user.id },
    include: { organization: true },
  });

  return (
    <EmployerLayout
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      }}
      orgName={contact?.organization.name}
    >
      <Suspense fallback={null}>
        <Flash />
      </Suspense>
      {children}
    </EmployerLayout>
  );
}

