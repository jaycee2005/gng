"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission, hashPassword, logAuditEvent } from "@/lib/auth";
import { run } from "@/lib/actions";
import { transition } from "@/lib/status";
import { emitEvent, processQueue, retryDelivery, EVENT_TYPES, RECIPIENT_ROLES } from "@/lib/dispatch";
import { validateTemplate } from "@/lib/templates";
import { statusLabel, URGENCIES } from "@/lib/workflow";
import { formatDate } from "@/lib/utils";
import * as v from "@/lib/validation";

// =============================================
// REQUESTS & APPLICATIONS (Operations)
// =============================================

export async function staffCreateRequest(form: FormData) {
  const user = await requirePermission("requests:write");
  await run("/admin/requests", async () => {
    const organizationId = v.text(form, "organizationId", { required: true, label: "Employer organization" });
    const title = v.text(form, "title", { required: true, max: 140, label: "Title" });
    const description = v.text(form, "description", { required: true, max: 3000, label: "Description" });
    const requirements = v.list(form, "requirements", 25);
    const positions = v.intInRange(form, "positions", 1, 100, "Positions");
    const urgency = v.oneOf(form, "urgency", URGENCIES, "Urgency");
    const startDate = v.optionalDate(form, "startDate", "Start date");
    const endDate = v.optionalDate(form, "endDate", "End date");

    const org = await prisma.employerOrganization.findUnique({ where: { id: organizationId } });
    if (!org) throw new v.ValidationError("Employer organization not found.");

    const req = await prisma.$transaction(async (tx) => {
      const created = await tx.employerRequest.create({
        data: {
          organizationId: org.id,
          title,
          description,
          requirements: JSON.stringify(requirements),
          positions,
          urgency,
          status: "APPROVED",
          startDate,
          endDate,
        },
      });
      await tx.statusChange.create({
        data: {
          entityType: "Request",
          entityId: created.id,
          fromStatus: null,
          toStatus: "APPROVED",
          changedById: user.id,
          reason: "Recorded directly by staff",
          requestId: created.id,
        },
      });
      return created;
    });

    await logAuditEvent(user.id, "staff_request_created", "request", req.id, { organizationId: org.id });
    return `Request "${req.title}" created and approved.`;
  });
}

export async function updateRequestStatus(form: FormData) {
  const user = await requirePermission("requests:write");
  const requestId = String(form.get("requestId") ?? "");

  await run(`/admin/requests/${requestId}`, async () => {
    const fromStatus = v.text(form, "fromStatus", { required: true });
    const toStatus = v.text(form, "toStatus", { required: true, label: "New status" });
    const reason = v.text(form, "reason", { max: 400, label: "Reason" });

    await prisma.$transaction((tx) =>
      transition(tx, "Request", requestId, fromStatus, toStatus, user.id, reason)
    );
    await logAuditEvent(user.id, "request_status_changed", "request", requestId, { fromStatus, toStatus, reason });
    return `Request moved to ${statusLabel(toStatus)}.`;
  });
}

export async function updateApplicationStatus(form: FormData) {
  const user = await requirePermission("applications:write");
  const returnTo = String(form.get("returnTo") || "/admin/applications");

  await run(returnTo, async () => {
    const applicationId = v.text(form, "applicationId", { required: true });
    const fromStatus = v.text(form, "fromStatus", { required: true });
    const toStatus = v.text(form, "toStatus", { required: true, label: "New status" });
    const reason = v.text(form, "reason", { max: 400, label: "Note / reason" });

    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        applicant: { include: { user: true } },
        request: { include: { organization: true } },
      },
    });
    if (!app) throw new v.ValidationError("Application not found.");

    const change = await prisma.$transaction(async (tx) => {
      const sc = await transition(tx, "Application", app.id, fromStatus, toStatus, user.id, reason);
      if (reason) {
        await tx.application.update({ where: { id: app.id }, data: { notes: reason } });
      }
      return sc;
    });

    await logAuditEvent(user.id, "application_status_changed", "application", app.id, {
      fromStatus,
      toStatus,
      reason,
    });

    await emitEvent({
      type: "application_status_changed",
      eventKey: `application_status:${change.id}`,
      applicantUserId: app.applicant.userId,
      organizationId: app.request.organizationId,
      links: {
        applicant: "/applicant/applications",
        employer: `/employer/requests/${app.requestId}`,
        staff: `/admin/requests/${app.requestId}`,
      },
      vars: {
        request_title: app.request.title,
        org_name: app.request.organization.name,
        status: statusLabel(toStatus),
        start_date: app.request.startDate ? formatDate(app.request.startDate) : "TBD",
      },
    });

    return `Application updated to ${statusLabel(toStatus)}.`;
  });
}

// =============================================
// CANDIDATE SHARING (FR-006, FR-007, FR-022)
// =============================================

export async function shareCandidateWithEmployer(form: FormData) {
  const user = await requirePermission("candidates:share");
  const requestId = String(form.get("requestId") ?? "");

  await run(`/admin/requests/${requestId}`, async () => {
    const applicantId = v.text(form, "applicantId", { required: true, label: "Applicant" });
    const summaryNote = v.text(form, "summaryNote", { required: true, max: 600, label: "Curated summary for employer" });
    const includeSkills = form.get("includeSkills") === "on";
    const includeExperience = form.get("includeExperience") === "on";
    const includeQualifications = form.get("includeQualifications") === "on";
    const includeAvailability = form.get("includeAvailability") === "on";

    const [applicant, request] = await Promise.all([
      prisma.applicantProfile.findUnique({ where: { id: applicantId }, include: { user: true } }),
      prisma.employerRequest.findUnique({ where: { id: requestId }, include: { organization: true } }),
    ]);
    if (!applicant || !request) throw new v.ValidationError("Applicant or request not found.");

    // Build sanitised snapshot — never includes personal phone/email unless explicitly shared (FR-022).
    const snapshot = {
      candidateName: `${applicant.user.firstName} ${applicant.user.lastName.charAt(0)}.`,
      preferredRole: applicant.preferredRole,
      summaryNote,
      skills: includeSkills ? v.parseJsonArray(applicant.skills) : [],
      experience: includeExperience ? v.parseJsonArray(applicant.experience) : [],
      qualifications: includeQualifications ? v.parseJsonArray(applicant.qualifications) : [],
      availability: includeAvailability ? applicant.availability : null,
    };

    const share = await prisma.candidateShare.upsert({
      where: { applicantId_requestId: { applicantId: applicant.id, requestId: request.id } },
      update: { sharedInfo: JSON.stringify(snapshot), sharedById: user.id },
      create: {
        applicantId: applicant.id,
        requestId: request.id,
        sharedById: user.id,
        sharedInfo: JSON.stringify(snapshot),
      },
    });

    await logAuditEvent(user.id, "candidate_shared", "candidate_share", share.id, {
      applicantId: applicant.id,
      requestId: request.id,
      organizationId: request.organizationId,
    });

    await emitEvent({
      type: "candidate_shared",
      eventKey: `candidate_shared:${share.id}`,
      applicantUserId: applicant.userId,
      organizationId: request.organizationId,
      links: {
        employer: `/employer/requests/${request.id}`,
        applicant: "/applicant/applications",
      },
      vars: {
        request_title: request.title,
        org_name: request.organization.name,
        status: "Candidate Shared",
        start_date: request.startDate ? formatDate(request.startDate) : "TBD",
      },
    });

    return `Shared ${snapshot.candidateName} with ${request.organization.name}.`;
  });
}

// =============================================
// ASSIGNMENTS & DISPATCH (User Story 4, FR-011..FR-021)
// =============================================

export async function createAssignment(form: FormData) {
  const user = await requirePermission("dispatch:write");
  await run("/admin/dispatch", async () => {
    const applicantId = v.text(form, "applicantId", { required: true, label: "Applicant" });
    const requestId = v.text(form, "requestId", { required: true, label: "Request" });
    const startDate = v.optionalDate(form, "startDate", "Start date");
    const endDate = v.optionalDate(form, "endDate", "End date");
    const instructions = v.text(form, "instructions", { required: true, max: 1000, label: "Dispatch instructions" });
    const notes = v.text(form, "notes", { max: 600, label: "Internal notes" });
    const dispatchNow = form.get("dispatchNow") === "on";

    const [applicant, request] = await Promise.all([
      prisma.applicantProfile.findUnique({ where: { id: applicantId }, include: { user: true } }),
      prisma.employerRequest.findUnique({ where: { id: requestId }, include: { organization: true } }),
    ]);
    if (!applicant || !request) throw new v.ValidationError("Select a valid applicant and request.");
    if (["CANCELLED", "CLOSED"].includes(request.status)) {
      throw new v.ValidationError("Cannot create an assignment for a cancelled or closed request.");
    }

    const initialStatus = dispatchNow ? "DISPATCHED" : "PLANNED";
    const { assignment, change } = await prisma.$transaction(async (tx) => {
      const created = await tx.assignment.create({
        data: {
          applicantId: applicant.id,
          requestId: request.id,
          assignedById: user.id,
          status: initialStatus,
          startDate,
          endDate,
          instructions,
          notes: notes || null,
        },
      });
      const sc = await tx.statusChange.create({
        data: {
          entityType: "Assignment",
          entityId: created.id,
          fromStatus: null,
          toStatus: initialStatus,
          changedById: user.id,
          reason: dispatchNow ? "Created and dispatched immediately" : "Planned assignment created",
          assignmentId: created.id,
        },
      });
      return { assignment: created, change: sc };
    });

    await logAuditEvent(user.id, "assignment_created", "assignment", assignment.id, {
      status: initialStatus,
      applicantId: applicant.id,
      requestId: request.id,
    });

    if (dispatchNow) {
      await emitEvent({
        type: "assignment_dispatched",
        eventKey: `assignment_dispatched:${change.id}`,
        assignmentId: assignment.id,
        applicantUserId: applicant.userId,
        organizationId: request.organizationId,
        links: {
          applicant: "/applicant/notifications",
          employer: `/employer/requests/${request.id}`,
          staff: "/admin/dispatch",
        },
        vars: {
          request_title: request.title,
          org_name: request.organization.name,
          status: "Dispatched",
          start_date: startDate ? formatDate(startDate) : "Immediate",
        },
      });
    }

    return dispatchNow
      ? "Assignment created and dispatch SMS notification evaluated."
      : "Planned assignment recorded.";
  });
}

export async function updateAssignmentStatus(form: FormData) {
  const user = await requirePermission("dispatch:write");
  await run("/admin/dispatch", async () => {
    const assignmentId = v.text(form, "assignmentId", { required: true });
    const fromStatus = v.text(form, "fromStatus", { required: true });
    const toStatus = v.text(form, "toStatus", { required: true, label: "New status" });
    const reason = v.text(form, "reason", { max: 400, label: "Reason" });

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        applicant: { include: { user: true } },
        request: { include: { organization: true } },
      },
    });
    if (!assignment) throw new v.ValidationError("Assignment not found.");

    const change = await prisma.$transaction((tx) =>
      transition(tx, "Assignment", assignment.id, fromStatus, toStatus, user.id, reason)
    );

    await logAuditEvent(user.id, "assignment_status_changed", "assignment", assignment.id, {
      fromStatus,
      toStatus,
      reason,
    });

    if (toStatus === "DISPATCHED" || toStatus === "CANCELLED") {
      await emitEvent({
        type: toStatus === "DISPATCHED" ? "assignment_dispatched" : "assignment_cancelled",
        eventKey: `assignment_${toStatus.toLowerCase()}:${change.id}`,
        assignmentId: assignment.id,
        applicantUserId: assignment.applicant.userId,
        organizationId: assignment.request.organizationId,
        links: {
          applicant: "/applicant/notifications",
          employer: `/employer/requests/${assignment.requestId}`,
          staff: "/admin/dispatch",
        },
        vars: {
          request_title: assignment.request.title,
          org_name: assignment.request.organization.name,
          status: statusLabel(toStatus),
          start_date: assignment.startDate ? formatDate(assignment.startDate) : "TBD",
        },
      });
    }

    const recallNotice =
      toStatus === "CANCELLED"
        ? " Note: previously delivered SMS messages cannot be recalled; a new cancellation notice has been evaluated."
        : "";
    return `Assignment updated to ${statusLabel(toStatus)}.${recallNotice}`;
  });
}

export async function reprocessAssignmentEvent(form: FormData) {
  const user = await requirePermission("dispatch:write");
  await run("/admin/dispatch", async () => {
    const assignmentId = v.text(form, "assignmentId", { required: true });
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        applicant: true,
        request: { include: { organization: true } },
        statusChanges: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!assignment || assignment.status !== "DISPATCHED") {
      throw new v.ValidationError("Only dispatched assignments can be re-evaluated.");
    }
    const latestChange = assignment.statusChanges[0];
    const eventKey = latestChange ? `assignment_dispatched:${latestChange.id}` : `assignment_dispatched:${assignment.id}`;

    await emitEvent({
      type: "assignment_dispatched",
      eventKey,
      assignmentId: assignment.id,
      applicantUserId: assignment.applicant.userId,
      organizationId: assignment.request.organizationId,
      links: {
        applicant: "/applicant/notifications",
        employer: `/employer/requests/${assignment.requestId}`,
        staff: "/admin/dispatch",
      },
      vars: {
        request_title: assignment.request.title,
        org_name: assignment.request.organization.name,
        status: "Dispatched",
        start_date: assignment.startDate ? formatDate(assignment.startDate) : "Immediate",
      },
    });
    await logAuditEvent(user.id, "dispatch_event_reprocessed", "assignment", assignment.id, { eventKey });
    return "Event reprocessed safely — duplicate messages were prevented by idempotency keys.";
  });
}

export async function manualRetryNotification(form: FormData) {
  const user = await requirePermission("dispatch:write");
  await run("/admin/dispatch/notifications", async () => {
    const deliveryId = v.text(form, "deliveryId", { required: true });
    const ok = await retryDelivery(deliveryId);
    if (!ok) throw new v.ValidationError("Only failed deliveries can be retried.");
    await logAuditEvent(user.id, "notification_manual_retry", "notification_delivery", deliveryId);
    return "Retry executed.";
  });
}

export async function runNotificationQueue() {
  const user = await requirePermission("dispatch:write");
  await run("/admin/dispatch/notifications", async () => {
    const count = await processQueue();
    await logAuditEvent(user.id, "notification_queue_processed", "notification_delivery", null, { count });
    return `Processed ${count} due queued notification(s).`;
  });
}

// =============================================
// ADMIN CONFIGURATION (User Story 5, FR-017)
// =============================================

export async function toggleNotificationRule(form: FormData) {
  const user = await requirePermission("settings:write");
  await run("/admin/settings/notifications", async () => {
    const ruleId = v.text(form, "ruleId", { required: true });
    const isEnabled = form.get("isEnabled") === "true";

    const rule = await prisma.notificationRule.update({
      where: { id: ruleId },
      data: { isEnabled },
    });
    await logAuditEvent(user.id, "notification_rule_toggled", "notification_rule", rule.id, {
      name: rule.name,
      isEnabled,
    });
    return `Rule "${rule.name}" ${isEnabled ? "enabled" : "disabled"}. Prior delivery records remain unchanged.`;
  });
}

export async function createNotificationRule(form: FormData) {
  const user = await requirePermission("settings:write");
  await run("/admin/settings/notifications", async () => {
    const name = v.text(form, "name", { required: true, max: 100, label: "Rule name" });
    const eventType = v.oneOf(
      form,
      "eventType",
      EVENT_TYPES.map((e) => e.value) as unknown as readonly string[],
      "Event type"
    );
    const recipientRole = v.oneOf(form, "recipientRole", RECIPIENT_ROLES, "Recipient role");
    const templateId = v.text(form, "templateId", { required: true, label: "Template" });

    const rule = await prisma.notificationRule.create({
      data: { name, eventType, recipientRole, templateId, isEnabled: true },
    });
    await logAuditEvent(user.id, "notification_rule_created", "notification_rule", rule.id, {
      name,
      eventType,
      recipientRole,
    });
    return `Notification rule "${rule.name}" created.`;
  });
}

export async function saveNotificationTemplate(form: FormData) {
  const user = await requirePermission("settings:write");
  await run("/admin/settings/templates", async () => {
    const templateId = v.text(form, "templateId");
    const name = v.text(form, "name", { required: true, max: 100, label: "Template name" });
    const body = v.text(form, "body", { required: true, max: 320, label: "Message template" });
    const isActive = form.get("isActive") !== "false";

    const problems = validateTemplate(body);
    if (problems.length) throw new v.ValidationError(problems.join(" "));

    if (templateId) {
      const updated = await prisma.notificationTemplate.update({
        where: { id: templateId },
        data: { name, body, isActive, version: { increment: 1 } },
      });
      await logAuditEvent(user.id, "notification_template_updated", "notification_template", updated.id, {
        version: updated.version,
        isActive,
      });
      return `Template "${updated.name}" updated to v${updated.version}.`;
    } else {
      const created = await prisma.notificationTemplate.create({
        data: { name, body, version: 1, isActive: true },
      });
      await logAuditEvent(user.id, "notification_template_created", "notification_template", created.id, {
        name,
      });
      return `Template "${created.name}" created.`;
    }
  });
}

export async function updateRolePermissions(form: FormData) {
  const user = await requirePermission("users:manage");
  await run("/admin/settings/roles", async () => {
    const roleId = v.text(form, "roleId", { required: true });
    const permissionIds = form.getAll("permissionIds").map(String);

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new v.ValidationError("Role not found.");

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      ...(permissionIds.length
        ? [
            prisma.rolePermission.createMany({
              data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
            }),
          ]
        : []),
    ]);

    await logAuditEvent(user.id, "role_permissions_updated", "role", role.id, {
      roleName: role.name,
      permissionCount: permissionIds.length,
    });
    return `Permissions updated for role "${role.name}".`;
  });
}

export async function createStaffAccount(form: FormData) {
  const user = await requirePermission("users:manage");
  await run("/admin/settings/roles", async () => {
    const firstName = v.text(form, "firstName", { required: true, max: 60, label: "First name" });
    const lastName = v.text(form, "lastName", { required: true, max: 60, label: "Last name" });
    const email = v.email(form);
    const password = v.password(form);
    const phone = v.phone(form, "phone");
    const roleId = v.text(form, "roleId", { required: true, label: "Role" });

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role || role.portal !== "ADMIN") throw new v.ValidationError("Choose a valid staff role.");

    try {
      const created = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          phone,
          passwordHash: await hashPassword(password),
          roles: { create: { roleId: role.id } },
          smsConsent: phone
            ? { create: { phoneNumber: phone, consentStatus: "OPTED_IN", consentMethod: "staff_onboarding" } }
            : undefined,
        },
      });
      await logAuditEvent(user.id, "staff_user_created", "user", created.id, { role: role.name });
      return `Created ${role.name} account for ${firstName} ${lastName}.`;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new v.ValidationError("A user with that email already exists.");
      }
      throw err;
    }
  });
}

export async function updateUserAccountStatus(form: FormData) {
  const user = await requirePermission("users:manage");
  await run("/admin/settings/roles", async () => {
    const targetUserId = v.text(form, "userId", { required: true });
    const accountStatus = v.oneOf(form, "accountStatus", ["ACTIVE", "DISABLED", "SUSPENDED"] as const, "Status");
    if (targetUserId === user.id && accountStatus !== "ACTIVE") {
      throw new v.ValidationError("You cannot disable your own account.");
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: targetUserId }, data: { accountStatus } }),
      ...(accountStatus !== "ACTIVE" ? [prisma.session.deleteMany({ where: { userId: targetUserId } })] : []),
    ]);

    await logAuditEvent(user.id, "user_account_status_changed", "user", targetUserId, { accountStatus });
    return `Account status set to ${accountStatus}.`;
  });
}

export async function createEmployerOrganizationAdmin(form: FormData) {
  const user = await requirePermission("employers:write");
  await run("/admin/employers", async () => {
    const name = v.text(form, "name", { required: true, max: 120, label: "Organization name" });
    const industry = v.text(form, "industry", { max: 80, label: "Industry" });
    const website = v.text(form, "website", { max: 200, label: "Website" });
    const phone = v.phone(form, "phone");
    const address = v.text(form, "address", { max: 240, label: "Address" });

    const org = await prisma.employerOrganization.create({
      data: {
        name,
        industry: industry || null,
        website: website || null,
        phone,
        address: address || null,
      },
    });
    await logAuditEvent(user.id, "employer_org_created", "employer_organization", org.id, { name });
    return `Employer organization "${org.name}" added.`;
  });
}

