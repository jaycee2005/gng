import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateEmployerOrganization } from "@/app/actions/employer";
import { updateSmsConsent } from "@/app/actions/account";
import { Card, CardHeader, CardTitle, Badge } from "@/components/ui/common";
import { Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function EmployerOrganizationPage() {
  const user = await requireUser("EMPLOYER");
  const [contact, consent] = await Promise.all([
    prisma.employerContact.findUnique({
      where: { userId: user.id },
      include: { organization: { include: { contacts: { include: { user: true } } } } },
    }),
    prisma.smsConsent.findUnique({ where: { userId: user.id } }),
  ]);

  if (!contact) {
    return <Card>Organization profile not found.</Card>;
  }

  const org = contact.organization;
  const currentConsent = consent?.consentStatus ?? "OPTED_OUT";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-2 border-b border-[var(--color-border)]">
        <h1 className="font-display text-2xl font-normal text-[var(--color-foreground)]">
          Organization &amp; Notification Preferences
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          Manage your company details, authorized contacts, and SMS dispatch alert preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Profile</CardTitle>
        </CardHeader>

        <form action={updateEmployerOrganization} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Organization Name" name="name" required defaultValue={org.name} />
            <Input label="Industry" name="industry" defaultValue={org.industry ?? ""} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Website" name="website" defaultValue={org.website ?? ""} />
            <Input
              label="Organization Phone (PH / E.164)"
              name="phone"
              defaultValue={org.phone ?? ""}
              placeholder="09171234567 or +639171234567"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Address" name="address" defaultValue={org.address ?? ""} />
            <Input label="Your Job Title" name="jobTitle" defaultValue={contact.jobTitle ?? ""} />
          </div>

          <SubmitButton>Save Organization Details</SubmitButton>
        </form>
      </Card>

      {/* Employer Contact SMS Preference */}
      <Card>
        <CardHeader>
          <CardTitle>Your SMS Notification Consent</CardTitle>
          <Badge variant="status" status={currentConsent}>
            {currentConsent === "OPTED_IN" ? "Opted In" : "Opted Out"}
          </Badge>
        </CardHeader>

        <form action={updateSmsConsent} className="space-y-4">
          <input type="hidden" name="returnTo" value="/employer/organization" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Your Mobile Number (PH / E.164)"
              name="phone"
              defaultValue={consent?.phoneNumber ?? user.phone ?? ""}
              placeholder="09171234567 or +639171234567"
            />
            <Select
              label="SMS Notification Preference"
              name="consent"
              defaultValue={currentConsent}
              options={[
                { value: "OPTED_IN", label: "Opted In — Receive candidate & dispatch SMS" },
                { value: "OPTED_OUT", label: "Opted Out — Do not send SMS" },
              ]}
            />
          </div>
          <SubmitButton>Update SMS Preference</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
