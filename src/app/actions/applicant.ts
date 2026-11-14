"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser, logAuditEvent } from "@/lib/auth";
import { run } from "@/lib/actions";
import { formatDate } from "@/lib/utils";
import * as v from "@/lib/validation";

async function getApplicantProfile(userId: string) {
  const existing = await prisma.applicantProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.applicantProfile.create({ data: { userId } });
}

export async function updateApplicantProfile(form: FormData) {
  const user = await requireUser("APPLICANT");
  await run("/applicant/profile", async () => {
    const firstName = v.text(form, "firstName", { required: true, max: 60, label: "First name" });
    const lastName = v.text(form, "lastName", { required: true, max: 60, label: "Last name" });
    const phone = v.phone(form, "phone");
    const summary = v.text(form, "summary", { max: 1200, label: "Summary" });
    const preferredRole = v.text(form, "preferredRole", { max: 100, label: "Preferred role" });
    const availability = v.text(form, "availability", { max: 100, label: "Availability" });
    const resumeUrl = v.text(form, "resumeUrl", { max: 300, label: "Resume link" });
    const skills = v.list(form, "skills", 25);
    const experience = v.list(form, "experience", 20);
    const qualifications = v.list(form, "qualifications", 20);

    const profile = await getApplicantProfile(user.id);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { firstName, lastName, phone } }),
      prisma.applicantProfile.update({
        where: { id: profile.id },
        data: {
          summary: summary || null,
          preferredRole: preferredRole || null,
          availability: availability || null,
          resumeUrl: resumeUrl || null,
          skills: JSON.stringify(skills),
          experience: JSON.stringify(experience),
          qualifications: JSON.stringify(qualifications),
        },
      }),
    ]);
    await logAuditEvent(user.id, "applicant_profile_updated", "applicant_profile", profile.id);
    return "Profile saved.";
  });
}

export async function submitApplication(form: FormData) {
  const user = await requireUser("APPLICANT");
  await run("/applicant/applications", async () => {
    const requestId = v.text(form, "requestId", { required: true, label: "Opportunity" });
    const coverLetter = v.text(form, "coverLetter", { required: true, max: 2000, label: "Cover letter" });

    const request = await prisma.employerRequest.findUnique({ where: { id: requestId } });
    if (!request || !["APPROVED", "IN_PROGRESS"].includes(request.status)) {
      throw new v.ValidationError("This opportunity is no longer open for applications.");
    }

    const profile = await getApplicantProfile(user.id);
    try {
      const app = await prisma.$transaction(async (tx) => {
        const created = await tx.application.create({
          data: {
            applicantId: profile.id,
            requestId: request.id,
            coverLetter,
            status: "SUBMITTED",
          },
        });
        await tx.statusChange.create({
          data: {
            entityType: "Application",
            entityId: created.id,
            fromStatus: null,
            toStatus: "SUBMITTED",
            changedById: user.id,
            reason: "Application submitted by applicant",
            applicationId: created.id,
          },
        });
        return created;
      });
      await logAuditEvent(user.id, "application_submitted", "application", app.id, {
        requestId: request.id,
      });
      return `Application submitted for "${request.title}". Status: Submitted (${formatDate(new Date())}).`;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new v.ValidationError("You have already applied to this opportunity.");
      }
      throw err;
    }
  });
}

export async function withdrawApplication(form: FormData) {
  const user = await requireUser("APPLICANT");
  await run("/applicant/applications", async () => {
    const applicationId = v.text(form, "applicationId", { required: true });
    const profile = await getApplicantProfile(user.id);

    const app = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!app || app.applicantId !== profile.id) {
      await logAuditEvent(user.id, "unauthorized_application_access", "application", applicationId);
      throw new v.ValidationError("Application not found.");
    }
    if (["ACCEPTED", "REJECTED", "WITHDRAWN"].includes(app.status)) {
      throw new v.ValidationError("This application can no longer be withdrawn.");
    }

    await prisma.$transaction([
      prisma.application.update({ where: { id: app.id }, data: { status: "WITHDRAWN" } }),
      prisma.statusChange.create({
        data: {
          entityType: "Application",
          entityId: app.id,
          fromStatus: app.status,
          toStatus: "WITHDRAWN",
          changedById: user.id,
          reason: "Withdrawn by applicant",
          applicationId: app.id,
        },
      }),
    ]);
    await logAuditEvent(user.id, "application_withdrawn", "application", app.id);
    return "Application withdrawn.";
  });
}

