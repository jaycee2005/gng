"use server";

import { prisma } from "@/lib/db";
import { requireUser, logAuditEvent } from "@/lib/auth";
import { run } from "@/lib/actions";
import { emitEvent } from "@/lib/dispatch";
import { EMPLOYER_RESPONSES, URGENCIES } from "@/lib/workflow";
import { formatDate } from "@/lib/utils";
import * as v from "@/lib/validation";

async function getEmployerContact(userId: string) {
  const contact = await prisma.employerContact.findUnique({
    where: { userId },
    include: { organization: true },
  });
  if (!contact) throw new v.ValidationError("Your account is not linked to an employer organization.");
  return contact;
}

export async function createEmployerRequest(form: FormData) {
  const user = await requireUser("EMPLOYER");
  const contact = await getEmployerContact(user.id);

  await run("/employer/requests", async () => {
    const title = v.text(form, "title", { required: true, max: 140, label: "Request title" });
    const description = v.text(form, "description", { required: true, max: 3000, label: "Description" });
    const requirements = v.list(form, "requirements", 25);
    const positions = v.intInRange(form, "positions", 1, 100, "Positions");
    const urgency = v.oneOf(form, "urgency", URGENCIES, "Urgency");
    const startDate = v.optionalDate(form, "startDate", "Start date");
    const endDate = v.optionalDate(form, "endDate", "End date");
    if (startDate && endDate && endDate < startDate) {
      throw new v.ValidationError("End date cannot be earlier than start date.");
    }

    const req = await prisma.$transaction(async (tx) => {
      const created = await tx.employerRequest.create({
        data: {
          organizationId: contact.organizationId,
          title,
          description,
          requirements: JSON.stringify(requirements),
          positions,
          urgency,
          status: "SUBMITTED",
          startDate,
          endDate,
        },
      });
      await tx.statusChange.create({
        data: {
          entityType: "Request",
          entityId: created.id,
          fromStatus: null,
          toStatus: "SUBMITTED",
          changedById: user.id,
          reason: "Submitted via employer portal",
          requestId: created.id,
        },
      });
      return created;
    });

    await logAuditEvent(user.id, "employer_request_created", "request", req.id, {
      organizationId: contact.organizationId,
      urgency,
    });

    await emitEvent({
      type: "request_submitted",
      eventKey: `request_submitted:${req.id}`,
      organizationId: contact.organizationId,
      links: {
        employer: `/employer/requests/${req.id}`,
        staff: `/admin/requests/${req.id}`,
      },
      vars: {
        request_title: req.title,
        org_name: contact.organization.name,
        status: "Submitted",
        start_date: req.startDate ? formatDate(req.startDate) : "TBD",
      },
    });

    return `Request "${req.title}" submitted.`;
  });
}

export async function cancelEmployerRequest(form: FormData) {
  const user = await requireUser("EMPLOYER");
  const contact = await getEmployerContact(user.id);
  const requestId = String(form.get("requestId") ?? "");

  await run(`/employer/requests/${requestId}`, async () => {
    const req = await prisma.employerRequest.findUnique({ where: { id: requestId } });
    if (!req || req.organizationId !== contact.organizationId) {
      await logAuditEvent(user.id, "unauthorized_request_access", "request", requestId);
      throw new v.ValidationError("Request not found.");
    }
    if (["CANCELLED", "CLOSED", "FILLED"].includes(req.status)) {
      throw new v.ValidationError("This request cannot be cancelled in its current status.");
    }
    const reason = v.text(form, "reason", { required: true, max: 400, label: "Cancellation reason" });

    await prisma.$transaction([
      prisma.employerRequest.update({ where: { id: req.id }, data: { status: "CANCELLED" } }),
      prisma.statusChange.create({
        data: {
          entityType: "Request",
          entityId: req.id,
          fromStatus: req.status,
          toStatus: "CANCELLED",
          changedById: user.id,
          reason,
          requestId: req.id,
        },
      }),
    ]);
    await logAuditEvent(user.id, "employer_request_cancelled", "request", req.id, { reason });
    return "Request cancelled. Any previously delivered notifications remain on record and cannot be recalled.";
  });
}

export async function respondToCandidateShare(form: FormData) {
  const user = await requireUser("EMPLOYER");
  const contact = await getEmployerContact(user.id);
  const returnTo = String(form.get("returnTo") || "/employer/candidates");

  await run(returnTo, async () => {
    const shareId = v.text(form, "shareId", { required: true });
    const decision = v.oneOf(
      form,
      "decision",
      EMPLOYER_RESPONSES.map((r) => r.value) as unknown as readonly string[],
      "Response"
    );
    const note = v.text(form, "note", { max: 500, label: "Notes" });

    const share = await prisma.candidateShare.findUnique({
      where: { id: shareId },
      include: { request: true },
    });
    if (!share || share.request.organizationId !== contact.organizationId) {
      await logAuditEvent(user.id, "unauthorized_candidate_share_access", "candidate_share", shareId);
      throw new v.ValidationError("Shared candidate record not found.");
    }

    const responseText = note ? `${decision}: ${note}` : decision;
    await prisma.candidateShare.update({
      where: { id: share.id },
      data: { response: responseText, respondedAt: new Date() },
    });

    await logAuditEvent(user.id, "employer_candidate_response", "candidate_share", share.id, {
      decision,
      requestId: share.requestId,
    });
    return "Your response has been recorded and shared with the agency.";
  });
}

export async function updateEmployerOrganization(form: FormData) {
  const user = await requireUser("EMPLOYER");
  const contact = await getEmployerContact(user.id);

  await run("/employer/organization", async () => {
    const name = v.text(form, "name", { required: true, max: 120, label: "Organization name" });
    const industry = v.text(form, "industry", { max: 80, label: "Industry" });
    const website = v.text(form, "website", { max: 200, label: "Website" });
    const address = v.text(form, "address", { max: 240, label: "Address" });
    const phone = v.phone(form, "phone");
    const jobTitle = v.text(form, "jobTitle", { max: 80, label: "Your job title" });

    await prisma.$transaction([
      prisma.employerOrganization.update({
        where: { id: contact.organizationId },
        data: {
          name,
          industry: industry || null,
          website: website || null,
          address: address || null,
          phone,
        },
      }),
      prisma.employerContact.update({
        where: { id: contact.id },
        data: { jobTitle: jobTitle || null },
      }),
    ]);

    await logAuditEvent(user.id, "employer_org_updated", "employer_organization", contact.organizationId);
    return "Organization details updated.";
  });
}

