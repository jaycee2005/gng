import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { name: "requests:read", resource: "requests", action: "read", description: "View employer requests" },
  { name: "requests:write", resource: "requests", action: "write", description: "Create and update employer requests" },
  { name: "applications:read", resource: "applications", action: "read", description: "View applicant submissions" },
  { name: "applications:write", resource: "applications", action: "write", description: "Advance application statuses" },
  { name: "candidates:share", resource: "candidates", action: "share", description: "Share candidate profiles with employers" },
  { name: "employers:write", resource: "employers", action: "write", description: "Manage employer organizations" },
  { name: "dispatch:read", resource: "dispatch", action: "read", description: "View assignments and SMS logs" },
  { name: "dispatch:write", resource: "dispatch", action: "write", description: "Create assignments and trigger dispatch SMS" },
  { name: "audit:read", resource: "audit", action: "read", description: "View security and operational audit trail" },
  { name: "settings:write", resource: "settings", action: "write", description: "Configure notification rules and templates" },
  { name: "users:manage", resource: "users", action: "manage", description: "Manage staff accounts and role permissions" },
];

async function main() {
  const ifEmptyOnly = process.argv.includes("--if-empty");
  if (ifEmptyOnly) {
    const existingRoles = await prisma.role.count();
    if (existingRoles > 0) {
      console.log("Database already initialized — skipping seed.");
      return;
    }
  }

  console.log("Seeding database...");

  await prisma.auditEvent.deleteMany();
  await prisma.notificationDelivery.deleteMany();
  await prisma.notificationRule.deleteMany();
  await prisma.notificationTemplate.deleteMany();
  await prisma.smsConsent.deleteMany();
  await prisma.statusChange.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.candidateShare.deleteMany();
  await prisma.application.deleteMany();
  await prisma.employerRequest.deleteMany();
  await prisma.employerContact.deleteMany();
  await prisma.employerOrganization.deleteMany();
  await prisma.applicantProfile.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Permissions & Roles
  const createdPerms = await Promise.all(
    PERMISSIONS.map((p) => prisma.permission.create({ data: p }))
  );
  const permByName = Object.fromEntries(createdPerms.map((p) => [p.name, p]));

  const adminRole = await prisma.role.create({
    data: {
      name: "ADMIN",
      portal: "ADMIN",
      description: "Full agency administrator with access to operations, dispatch, and configuration",
      permissions: {
        create: createdPerms.map((p) => ({ permissionId: p.id })),
      },
    },
  });

  const staffPermNames = [
    "requests:read",
    "requests:write",
    "applications:read",
    "applications:write",
    "candidates:share",
    "employers:write",
    "dispatch:read",
    "dispatch:write",
  ];
  const staffRole = await prisma.role.create({
    data: {
      name: "STAFF",
      portal: "ADMIN",
      description: "Operations staff (cannot manage users/roles or system settings)",
      permissions: {
        create: staffPermNames.map((n) => ({ permissionId: permByName[n].id })),
      },
    },
  });

  const applicantRole = await prisma.role.create({
    data: { name: "APPLICANT", portal: "APPLICANT", description: "Job applicant or consultant" },
  });

  const employerRole = await prisma.role.create({
    data: { name: "EMPLOYER", portal: "EMPLOYER", description: "Client employer contact" },
  });

  // 2. Staff & Admin Users
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@consultpro.com",
      passwordHash,
      firstName: "Sarah",
      lastName: "Jenkins",
      phone: "+15555550100",
      roles: { create: [{ roleId: adminRole.id }] },
      smsConsent: {
        create: {
          phoneNumber: "+15555550100",
          consentStatus: "OPTED_IN",
          consentMethod: "staff_onboarding",
        },
      },
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      email: "staff@consultpro.com",
      passwordHash,
      firstName: "Marcus",
      lastName: "Vance",
      phone: "+15555550101",
      roles: { create: [{ roleId: staffRole.id }] },
      smsConsent: {
        create: {
          phoneNumber: "+15555550101",
          consentStatus: "OPTED_IN",
          consentMethod: "staff_onboarding",
        },
      },
    },
  });

  // 3. Applicants (one opted-in, one opted-out, one with retry-test phone)
  const applicantUser1 = await prisma.user.create({
    data: {
      email: "applicant@example.com",
      passwordHash,
      firstName: "Alex",
      lastName: "Morgan",
      phone: "+15555550200",
      roles: { create: [{ roleId: applicantRole.id }] },
      smsConsent: {
        create: {
          phoneNumber: "+15555550200",
          consentStatus: "OPTED_IN",
          consentMethod: "web_registration",
        },
      },
      applicantProfile: {
        create: {
          summary: "Principal Strategy & Enterprise Systems Consultant with 9+ years leading cloud, ERP, and operating-model transformations.",
          skills: JSON.stringify(["Management Consulting", "Enterprise Architecture", "Digital Transformation", "Stakeholder Alignment", "SQL & Python"]),
          experience: JSON.stringify([
            "Deloitte Consulting — Senior Manager (2021–2026)",
            "Accenture Strategy — Consultant (2017–2021)",
          ]),
          qualifications: JSON.stringify(["MBA, Wharton", "PMP Certified", "AWS Solutions Architect"]),
          availability: "Immediate (Full-time / Contract)",
          preferredRole: "Principal Transformation Lead",
          resumeUrl: "https://example.com/resumes/alex-morgan.pdf",
        },
      },
    },
    include: { applicantProfile: true },
  });

  const applicantUser2 = await prisma.user.create({
    data: {
      email: "priya.patel@example.com",
      passwordHash,
      firstName: "Priya",
      lastName: "Patel",
      phone: "+15555550202",
      roles: { create: [{ roleId: applicantRole.id }] },
      smsConsent: {
        create: {
          phoneNumber: "+15555550202",
          consentStatus: "OPTED_OUT",
          consentMethod: "web_registration",
          optOutAt: new Date(Date.now() - 86400000),
          optOutMethod: "web_form",
        },
      },
      applicantProfile: {
        create: {
          summary: "Cybersecurity & GRC Advisory Specialist focusing on SOC2, ISO 27001, and financial regulatory compliance.",
          skills: JSON.stringify(["GRC Advisory", "SOC 2 Type II", "ISO 27001", "Risk Assessment", "Zero Trust"]),
          experience: JSON.stringify(["KPMG Cyber — Manager (2020–2026)"]),
          qualifications: JSON.stringify(["CISSP", "CISM", "B.S. Computer Science"]),
          availability: "2 weeks notice",
          preferredRole: "Lead Security Consultant",
        },
      },
    },
    include: { applicantProfile: true },
  });

  // 4. Employer Organizations & Contacts
  const org1 = await prisma.employerOrganization.create({
    data: {
      name: "Acme Global Solutions",
      industry: "Financial Services",
      website: "https://acme.example.com",
      address: "100 Wall Street, Suite 2400, New York, NY",
      phone: "+15555550300",
    },
  });

  const org2 = await prisma.employerOrganization.create({
    data: {
      name: "Veridian Health Systems",
      industry: "Healthcare & Biotech",
      website: "https://veridian.example.com",
      address: "450 Kendall Square, Cambridge, MA",
      phone: "+15555550400",
    },
  });

  const employerUser1 = await prisma.user.create({
    data: {
      email: "employer@acme.example.com",
      passwordHash,
      firstName: "David",
      lastName: "Stone",
      phone: "+15555550300",
      roles: { create: [{ roleId: employerRole.id }] },
      smsConsent: {
        create: {
          phoneNumber: "+15555550300",
          consentStatus: "OPTED_IN",
          consentMethod: "web_registration",
        },
      },
      employerContact: {
        create: {
          organizationId: org1.id,
          jobTitle: "VP of Talent & Vendor Operations",
          isPrimary: true,
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      email: "elena@veridian.example.com",
      passwordHash,
      firstName: "Elena",
      lastName: "Rostova",
      phone: "+15555550400",
      roles: { create: [{ roleId: employerRole.id }] },
      smsConsent: {
        create: {
          phoneNumber: "+15555550400",
          consentStatus: "OPTED_IN",
          consentMethod: "web_registration",
        },
      },
      employerContact: {
        create: {
          organizationId: org2.id,
          jobTitle: "Director of Clinical Operations",
          isPrimary: true,
        },
      },
    },
  });

  // 5. Employer Requests
  const req1 = await prisma.employerRequest.create({
    data: {
      organizationId: org1.id,
      title: "Senior Enterprise Transformation Lead",
      description:
        "Lead a 6-month core banking cloud migration and operating model redesign across 4 regional business units.",
      requirements: JSON.stringify([
        "8+ years management consulting",
        "Financial services domain",
        "Cloud migration governance",
        "Executive stakeholder reporting",
      ]),
      positions: 2,
      urgency: "HIGH",
      status: "IN_PROGRESS",
      startDate: new Date(Date.now() + 7 * 86400000),
      endDate: new Date(Date.now() + 187 * 86400000),
    },
  });

  const req2 = await prisma.employerRequest.create({
    data: {
      organizationId: org1.id,
      title: "SOC 2 & Regulatory Compliance Auditor",
      description:
        "Conduct readiness assessment and remediation roadmap for upcoming SOC 2 Type II and PCI-DSS audits.",
      requirements: JSON.stringify(["CISSP or CISA", "SOC 2 Type II", "Financial controls"]),
      positions: 1,
      urgency: "URGENT",
      status: "APPROVED",
      startDate: new Date(Date.now() + 14 * 86400000),
    },
  });

  const req3 = await prisma.employerRequest.create({
    data: {
      organizationId: org2.id,
      title: "Clinical Workflow Optimization Consultant",
      description:
        "Analyze outpatient intake bottlenecks across 12 clinics and design standardized scheduling workflows.",
      requirements: JSON.stringify(["Healthcare operations", "Lean Six Sigma", "EHR integration"]),
      positions: 2,
      urgency: "NORMAL",
      status: "APPROVED",
      startDate: new Date(Date.now() + 21 * 86400000),
    },
  });

  // 6. Applications & Status History
  const app1 = await prisma.application.create({
    data: {
      applicantId: applicantUser1.applicantProfile!.id,
      requestId: req1.id,
      coverLetter:
        "I have led three multi-region core banking cloud migrations and can mobilize immediately for Acme Global Solutions.",
      status: "SHORTLISTED",
      notes: "Strong fit on both financial domain and executive governance.",
    },
  });

  const app2 = await prisma.application.create({
    data: {
      applicantId: applicantUser2.applicantProfile!.id,
      requestId: req2.id,
      coverLetter:
        "Led 15+ SOC 2 Type II readiness engagements for fintech and enterprise banking clients.",
      status: "SCREENING",
    },
  });

  await prisma.statusChange.createMany({
    data: [
      {
        entityType: "Request",
        entityId: req1.id,
        fromStatus: "SUBMITTED",
        toStatus: "IN_PROGRESS",
        changedById: adminUser.id,
        reason: "Approved and opened for candidate matching",
        requestId: req1.id,
      },
      {
        entityType: "Application",
        entityId: app1.id,
        fromStatus: "SUBMITTED",
        toStatus: "SHORTLISTED",
        changedById: staffUser.id,
        reason: "Verified credentials and executive references",
        applicationId: app1.id,
      },
      {
        entityType: "Application",
        entityId: app2.id,
        fromStatus: "SUBMITTED",
        toStatus: "SCREENING",
        changedById: staffUser.id,
        reason: "Initial compliance credentials check underway",
        applicationId: app2.id,
      },
    ],
  });

  // 7. Candidate Share (sanitized profile shared with Acme)
  await prisma.candidateShare.create({
    data: {
      applicantId: applicantUser1.applicantProfile!.id,
      requestId: req1.id,
      sharedById: staffUser.id,
      sharedInfo: JSON.stringify({
        candidateName: "Alex M.",
        preferredRole: "Principal Transformation Lead",
        summaryNote: "9+ yrs Deloitte/Accenture strategy & cloud migration lead. Available immediately.",
        skills: ["Management Consulting", "Enterprise Architecture", "Digital Transformation", "Stakeholder Alignment"],
        experience: ["Deloitte Consulting — Senior Manager (2021–2026)", "Accenture Strategy — Consultant (2017–2021)"],
        qualifications: ["MBA, Wharton", "PMP Certified", "AWS Solutions Architect"],
        availability: "Immediate (Full-time / Contract)",
      }),
    },
  });

  // 8. Notification Templates & Rules
  const tplDispatch = await prisma.notificationTemplate.create({
    data: {
      name: "Assignment Dispatched — Applicant",
      body: "ConsultPro: Hi {{first_name}}, you are dispatched to {{request_title}} ({{org_name}}) starting {{start_date}}. Sign in for details: {{portal_link}}",
      version: 1,
      isActive: true,
    },
  });

  const tplDispatchEmployer = await prisma.notificationTemplate.create({
    data: {
      name: "Assignment Dispatched — Employer",
      body: "ConsultPro: Hi {{first_name}}, a consultant has been dispatched for {{request_title}} starting {{start_date}}. View in portal: {{portal_link}}",
      version: 1,
      isActive: true,
    },
  });

  const tplCancelled = await prisma.notificationTemplate.create({
    data: {
      name: "Assignment Cancelled Notice",
      body: "ConsultPro: Hi {{first_name}}, assignment for {{request_title}} is now {{status}}. Check your portal for updated instructions: {{portal_link}}",
      version: 1,
      isActive: true,
    },
  });

  const tplAppStatus = await prisma.notificationTemplate.create({
    data: {
      name: "Application Status Update",
      body: "ConsultPro: Hi {{first_name}}, your application for {{request_title}} moved to {{status}}. View next steps: {{portal_link}}",
      version: 1,
      isActive: true,
    },
  });

  const tplShared = await prisma.notificationTemplate.create({
    data: {
      name: "Candidate Shared — Employer Alert",
      body: "ConsultPro: Hi {{first_name}}, a vetted candidate was shared for {{request_title}}. Review and respond: {{portal_link}}",
      version: 1,
      isActive: true,
    },
  });

  const ruleDispatchApplicant = await prisma.notificationRule.create({
    data: {
      name: "Notify Applicant on Dispatch",
      eventType: "assignment_dispatched",
      recipientRole: "applicant",
      templateId: tplDispatch.id,
      isEnabled: true,
    },
  });

  const ruleDispatchEmployer = await prisma.notificationRule.create({
    data: {
      name: "Notify Employer on Dispatch",
      eventType: "assignment_dispatched",
      recipientRole: "employer",
      templateId: tplDispatchEmployer.id,
      isEnabled: true,
    },
  });

  await prisma.notificationRule.create({
    data: {
      name: "Notify Applicant on Assignment Cancellation",
      eventType: "assignment_cancelled",
      recipientRole: "applicant",
      templateId: tplCancelled.id,
      isEnabled: true,
    },
  });

  const ruleAppStatus = await prisma.notificationRule.create({
    data: {
      name: "Notify Applicant on Application Status Change",
      eventType: "application_status_changed",
      recipientRole: "applicant",
      templateId: tplAppStatus.id,
      isEnabled: true,
    },
  });

  await prisma.notificationRule.create({
    data: {
      name: "Notify Employer when Candidate Shared",
      eventType: "candidate_shared",
      recipientRole: "employer",
      templateId: tplShared.id,
      isEnabled: true,
    },
  });

  // 9. Sample Assignment & Deliveries (showing Delivered + Suppressed opt-out)
  const assignment1 = await prisma.assignment.create({
    data: {
      applicantId: applicantUser1.applicantProfile!.id,
      requestId: req1.id,
      assignedById: adminUser.id,
      status: "DISPATCHED",
      startDate: new Date(Date.now() + 7 * 86400000),
      endDate: new Date(Date.now() + 187 * 86400000),
      instructions:
        "Report to Acme Global Solutions HQ (100 Wall St, 24th Floor) on Monday 9:00 AM EST. Primary point of contact: David Stone.",
      notes: "Security badge pre-registered.",
    },
  });

  await prisma.notificationDelivery.createMany({
    data: [
      {
        ruleId: ruleDispatchApplicant.id,
        eventKey: `seed_dispatch:${assignment1.id}`,
        assignmentId: assignment1.id,
        recipientPhone: "+15555550200",
        recipientUserId: applicantUser1.id,
        messageBody:
          "ConsultPro: Hi Alex, you are dispatched to Senior Enterprise Transformation Lead (Acme Global Solutions). Sign in for details: http://localhost:3000/login?next=%2Fapplicant%2Fnotifications",
        templateVersion: 1,
        status: "DELIVERED",
        attempts: 1,
        lastAttemptAt: new Date(),
        deliveredAt: new Date(),
        providerMessageId: "mock_seed_001",
      },
      {
        ruleId: ruleDispatchEmployer.id,
        eventKey: `seed_dispatch:${assignment1.id}`,
        assignmentId: assignment1.id,
        recipientPhone: "+15555550300",
        recipientUserId: employerUser1.id,
        messageBody:
          "ConsultPro: Hi David, a consultant has been dispatched for Senior Enterprise Transformation Lead. View in portal: http://localhost:3000/login?next=%2Femployer%2Frequests",
        templateVersion: 1,
        status: "DELIVERED",
        attempts: 1,
        lastAttemptAt: new Date(),
        deliveredAt: new Date(),
        providerMessageId: "mock_seed_002",
      },
      {
        ruleId: ruleAppStatus.id,
        eventKey: `seed_app_status:${app2.id}`,
        recipientPhone: "+15555550202",
        recipientUserId: applicantUser2.id,
        messageBody: "",
        templateVersion: 1,
        status: "SUPPRESSED",
        attempts: 0,
        suppressionReason: "opted_out",
      },
    ],
  });

  await prisma.auditEvent.create({
    data: {
      userId: adminUser.id,
      action: "system_seeded",
      resource: "system",
      details: JSON.stringify({ note: "Initial demo data loaded" }),
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
