// Status vocabularies and allowed transitions for each workflow entity.

export const REQUEST_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "IN_PROGRESS",
  "FILLED",
  "CANCELLED",
  "CLOSED",
] as const;

export const APPLICATION_STATUSES = [
  "SUBMITTED",
  "SCREENING",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFERED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
] as const;

export const ASSIGNMENT_STATUSES = [
  "PLANNED",
  "DISPATCHED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const;

export const URGENCIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

const REQUEST_FLOW: Record<string, string[]> = {
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["APPROVED", "CANCELLED"],
  APPROVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["FILLED", "CANCELLED"],
  FILLED: ["CLOSED", "IN_PROGRESS"],
  CANCELLED: [],
  CLOSED: [],
};

const APPLICATION_FLOW: Record<string, string[]> = {
  SUBMITTED: ["SCREENING", "REJECTED"],
  SCREENING: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["INTERVIEW", "REJECTED"],
  INTERVIEW: ["OFFERED", "REJECTED"],
  OFFERED: ["ACCEPTED", "REJECTED"],
  ACCEPTED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

const ASSIGNMENT_FLOW: Record<string, string[]> = {
  PLANNED: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const FLOWS = {
  Request: REQUEST_FLOW,
  Application: APPLICATION_FLOW,
  Assignment: ASSIGNMENT_FLOW,
} as const;

export type Entity = keyof typeof FLOWS;

export function nextStatuses(entity: Entity, current: string): string[] {
  return FLOWS[entity][current] ?? [];
}

export function canTransition(entity: Entity, from: string, to: string) {
  return nextStatuses(entity, from).includes(to);
}

export function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/** Applicant-facing next step for each application status (FR-005). */
export const APPLICANT_NEXT_STEP: Record<string, string> = {
  SUBMITTED: "We received your application. A recruiter will review it soon.",
  SCREENING: "A recruiter is reviewing your profile against the requirements.",
  SHORTLISTED: "You've been shortlisted. Your profile may be shared with the client.",
  INTERVIEW: "Interview stage. Watch for scheduling details from our team.",
  OFFERED: "You have an offer. Our team will contact you to confirm.",
  ACCEPTED: "Accepted. Assignment and dispatch details will appear in your portal.",
  REJECTED: "This application was not successful. Keep your profile current for new roles.",
  WITHDRAWN: "You withdrew this application.",
};

export const EMPLOYER_RESPONSES = [
  { value: "INTERESTED", label: "Interested" },
  { value: "REQUEST_INTERVIEW", label: "Request interview" },
  { value: "NOT_INTERESTED", label: "Not interested" },
] as const;

