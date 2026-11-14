import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { ApplicantLayout } from "@/components/layouts/applicant-layout";
import { Flash } from "@/components/ui/flash";

export default async function ApplicantPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("APPLICANT");

  return (
    <ApplicantLayout
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      }}
    >
      <Suspense fallback={null}>
        <Flash />
      </Suspense>
      {children}
    </ApplicantLayout>
  );
}

