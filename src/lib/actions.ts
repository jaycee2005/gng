import { redirect } from "next/navigation";
import { ValidationError } from "./validation";

/** Thrown when a record changed underneath the user (two staff editing at once). */
export class ConflictError extends Error {
  constructor(message = "This record was changed by someone else. Review the latest version and try again.") {
    super(message);
  }
}

/** Redirects back to `path` with a flash message shown by <Flash />. */
export function back(path: string, kind: "ok" | "error", message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`);
}

/**
 * Runs a mutation and redirects back with a success or user-facing error message.
 * Unexpected errors still propagate (and show the error boundary).
 */
export async function run(path: string, fn: () => Promise<string | void>): Promise<never> {
  let message: string | void;
  try {
    message = await fn();
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) back(path, "error", err.message);
    throw err;
  }
  back(path, "ok", message || "Saved.");
}

/** Only allow same-site relative paths (prevents open redirects through ?next=). */
export function safePath(value: unknown, fallback: string, mustStartWith?: string) {
  const path = typeof value === "string" ? value : "";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return fallback;
  if (mustStartWith && !(path === mustStartWith || path.startsWith(`${mustStartWith}/`) || path.startsWith(`${mustStartWith}?`)))
    return fallback;
  return path;
}

