// Notification template rendering and validation (FR-010, User Story 5 scenario 2).

export const MAX_SMS_LENGTH = 320; // two concatenated GSM segments

export const SUPPORTED_VARIABLES = [
  "first_name",
  "request_title",
  "org_name",
  "status",
  "start_date",
  "portal_link",
] as const;

export type TemplateVariable = (typeof SUPPORTED_VARIABLES)[number];
export type TemplateVars = Partial<Record<TemplateVariable, string>>;

const PLACEHOLDER_RE = /\{\{\s*([a-z_]+)\s*\}\}/g;

export function placeholdersIn(body: string): string[] {
  return [...body.matchAll(PLACEHOLDER_RE)].map((m) => m[1]);
}

/** Returns a list of problems with a template body; empty means valid. */
export function validateTemplate(body: string): string[] {
  const problems: string[] = [];
  if (!body.trim()) problems.push("Template body is required.");
  const unknown = placeholdersIn(body).filter(
    (p) => !SUPPORTED_VARIABLES.includes(p as TemplateVariable)
  );
  if (unknown.length) problems.push(`Unsupported placeholders: ${[...new Set(unknown)].join(", ")}.`);
  if (/\{\{|\}\}/.test(body.replace(PLACEHOLDER_RE, "")))
    problems.push("Template has an unclosed or malformed {{placeholder}}.");
  if (!placeholdersIn(body).includes("portal_link"))
    problems.push("Template must include {{portal_link}} so recipients can view details securely.");
  if (body.length > MAX_SMS_LENGTH) problems.push(`Template is longer than ${MAX_SMS_LENGTH} characters.`);
  return problems;
}

export type RenderResult = { ok: true; message: string } | { ok: false; reason: string };

/** Renders a template; refuses to send when a value is missing or the result is too long. */
export function renderTemplate(body: string, vars: TemplateVars): RenderResult {
  const problems = validateTemplate(body);
  if (problems.length) return { ok: false, reason: "template_invalid" };

  const missing: string[] = [];
  const message = body.replace(PLACEHOLDER_RE, (_, key: TemplateVariable) => {
    const value = vars[key];
    if (!value) missing.push(key);
    return value ?? "";
  });

  if (missing.length) return { ok: false, reason: `missing_value:${missing.join(",")}` };
  if (message.length > MAX_SMS_LENGTH) return { ok: false, reason: "message_too_long" };
  return { ok: true, message };
}

