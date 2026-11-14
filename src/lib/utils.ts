import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11) {
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Request statuses — quiet, desaturated 4-family system
    SUBMITTED: "bg-[#E6EFF4] text-[#1E4E68]",
    UNDER_REVIEW: "bg-[#F5EFE2] text-[#7A5C22]",
    APPROVED: "bg-[#E3F1EC] text-[#1F6F54]",
    OPEN: "bg-[#E3F1EC] text-[#1F6F54]",
    IN_PROGRESS: "bg-[#E6EFF4] text-[#1E4E68]",
    FILLED: "bg-[#E3F1EC] text-[#1F6F54]",
    FULFILLED: "bg-[#E3F1EC] text-[#1F6F54]",
    CANCELLED: "bg-[#F6E6E6] text-[#8E2B2B]",
    CLOSED: "bg-[#EFECE6] text-[#525E70]",

    // Urgency levels
    LOW: "bg-[#EFECE6] text-[#525E70]",
    NORMAL: "bg-[#E6EFF4] text-[#1E4E68]",
    HIGH: "bg-[#F5EFE2] text-[#7A5C22]",
    URGENT: "bg-[#F6E6E6] text-[#8E2B2B]",

    // Application statuses
    SCREENING: "bg-[#E6EFF4] text-[#1E4E68]",
    SHORTLISTED: "bg-[#F5EFE2] text-[#7A5C22]",
    INTERVIEW: "bg-[#F5EFE2] text-[#7A5C22]",
    INTERVIEWING: "bg-[#F5EFE2] text-[#7A5C22]",
    OFFERED: "bg-[#E3F1EC] text-[#1F6F54]",
    HIRED: "bg-[#E3F1EC] text-[#1F6F54]",
    ACCEPTED: "bg-[#E3F1EC] text-[#1F6F54]",
    REJECTED: "bg-[#F6E6E6] text-[#8E2B2B]",
    WITHDRAWN: "bg-[#EFECE6] text-[#525E70]",

    // Assignment statuses
    PROPOSED: "bg-[#EFECE6] text-[#525E70]",
    PLANNED: "bg-[#E6EFF4] text-[#1E4E68]",
    DISPATCHED: "bg-[#F5EFE2] text-[#7A5C22]",
    ACTIVE: "bg-[#E3F1EC] text-[#1F6F54]",
    COMPLETED: "bg-[#E3F1EC] text-[#1F6F54]",

    // Delivery statuses
    QUEUED: "bg-[#EFECE6] text-[#525E70]",
    SENDING: "bg-[#E6EFF4] text-[#1E4E68]",
    SENT: "bg-[#E3F1EC] text-[#1F6F54]",
    DELIVERED: "bg-[#E3F1EC] text-[#1F6F54]",
    FAILED: "bg-[#F6E6E6] text-[#8E2B2B]",
    FAILED_RETRYABLE: "bg-[#F5EFE2] text-[#7A5C22]",
    FAILED_PERMANENT: "bg-[#F6E6E6] text-[#8E2B2B]",
    SUPPRESSED: "bg-[#F5EFE2] text-[#7A5C22]",
    SUPPRESSED_OPT_OUT: "bg-[#EFECE6] text-[#525E70]",
    SUPPRESSED_INVALID_PHONE: "bg-[#F5EFE2] text-[#7A5C22]",

    // Consent
    OPTED_IN: "bg-[#E3F1EC] text-[#1F6F54]",
    OPTED_OUT: "bg-[#EFECE6] text-[#525E70]",

    // Account
    DISABLED: "bg-[#F6E6E6] text-[#8E2B2B]",
    SUSPENDED: "bg-[#F5EFE2] text-[#7A5C22]",
  };
  return colors[status] || "bg-[#EFECE6] text-[#525E70]";
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}
