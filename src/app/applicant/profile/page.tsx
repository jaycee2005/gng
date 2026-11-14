import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateApplicantProfile } from "@/app/actions/applicant";
import { Card, CardHeader, CardTitle } from "@/components/ui/common";
import { Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { parseJsonArray } from "@/lib/validation";

export default async function ApplicantProfilePage() {
  const user = await requireUser("APPLICANT");
  const profile = await prisma.applicantProfile.findUnique({
    where: { userId: user.id },
  });

  const skills = parseJsonArray(profile?.skills).join(", ");
  const experience = parseJsonArray(profile?.experience).join(", ");
  const qualifications = parseJsonArray(profile?.qualifications).join(", ");

  return (
    <div className="max-w-3xl space-y-6">
      <div className="pb-2 border-b border-[var(--color-border)]">
        <h1 className="font-display text-2xl font-normal text-[var(--color-foreground)]">
          My Bio-Data &amp; Profile
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          Keep your credentials, skills, and availability up to date. Only vetted details are shared with partner employers when authorized by staff.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal &amp; Professional Qualifications</CardTitle>
        </CardHeader>

        <form action={updateApplicantProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First name"
              name="firstName"
              required
              defaultValue={user.firstName}
            />
            <Input
              label="Last name"
              name="lastName"
              required
              defaultValue={user.lastName}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email (account sign-in)"
              name="emailReadOnly"
              disabled
              defaultValue={user.email}
            />
            <Input
              label="Phone number (PH / E.164)"
              name="phone"
              type="tel"
              defaultValue={user.phone ?? ""}
              placeholder="09171234567 or +639171234567"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Preferred Role / Trade"
              name="preferredRole"
              defaultValue={profile?.preferredRole ?? ""}
              placeholder="e.g. Production Operator / Office Admin"
            />
            <Input
              label="Availability"
              name="availability"
              defaultValue={profile?.availability ?? ""}
              placeholder="Immediate / Shifting schedule"
            />
          </div>

          <Textarea
            label="Work Summary"
            name="summary"
            defaultValue={profile?.summary ?? ""}
            placeholder="Summarize your core work experience, trade skills, and preferred shift or assignment area..."
          />

          <Input
            label="Skills (comma-separated)"
            name="skills"
            defaultValue={skills}
            hint="Example: Forklift Operation, Quality Inspection, Inventory Control, MS Excel"
          />

          <Input
            label="Prior Experience Highlights (comma-separated)"
            name="experience"
            defaultValue={experience}
            hint="Example: Warehouse Staff — Calamba Hub (2022-2025), Production Aide (2020-2022)"
          />

          <Input
            label="Certifications &amp; Licenses (comma-separated)"
            name="qualifications"
            defaultValue={qualifications}
            hint="Example: TESDA NC II, Driver's License (1-2-3), First Aid & Safety"
          />

          <Input
            label="Resume / Portfolio URL"
            name="resumeUrl"
            type="url"
            defaultValue={profile?.resumeUrl ?? ""}
            placeholder="https://example.com/resume.pdf"
          />

          <div className="pt-2">
            <SubmitButton>Save Profile</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
