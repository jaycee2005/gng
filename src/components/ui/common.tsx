"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn, getStatusColor } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "status";
  status?: string;
  className?: string;
}

export function Badge({ children, variant = "default", status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "badge",
        variant === "status" && status
          ? getStatusColor(status)
          : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
        className
      )}
    >
      {children}
    </span>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg" | "none";
}

export function Card({ children, className, padding = "md" }: CardProps) {
  const paddingClasses = {
    none: "",
    sm: "p-3.5 sm:p-4",
    md: "p-4 sm:p-6",
    lg: "p-5 sm:p-8",
  };

  return (
    <div className={cn("card", paddingClasses[padding], className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2 mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("font-display text-base sm:text-lg font-medium text-[var(--color-foreground)]", className)}>
      {children}
    </h3>
  );
}

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
  href?: string;
}

export function KpiCard({ title, value, change, changeType = "neutral", icon, href }: KpiCardProps) {
  const changeColors = {
    positive: "text-[#1F6F54]",
    negative: "text-[#A83232]",
    neutral: "text-[var(--color-muted-foreground)]",
  };

  const content = (
    <Card
      className={cn(
        "flex items-start justify-between gap-3 transition-colors",
        href && "hover:border-[#B8B2A6]"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[var(--color-muted-foreground)] truncate">
          {title}
        </p>
        <p className="font-display text-2xl sm:text-[1.7rem] font-medium text-[var(--color-foreground)] mt-1 leading-tight tabular-nums">
          {value}
        </p>
        {change && (
          <p className={cn("text-xs mt-1.5 break-words", changeColors[changeType])}>{change}</p>
        )}
      </div>
      {icon && (
        <div
          className="flex-shrink-0 w-9 h-9 rounded-md bg-[var(--color-muted)] flex items-center justify-center text-[var(--color-secondary)]"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-[var(--card-radius)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
      >
        {content}
      </Link>
    );
  }

  return content;
}

/**
 * A card whose body is hidden until the user asks for it. Used for creation
 * forms so the working queue below stays above the fold.
 */
export function CollapsibleCard({
  title,
  subtitle,
  icon,
  actionLabel,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actionLabel: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="card group" open={defaultOpen}>
      <summary className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-6 cursor-pointer list-none rounded-[var(--card-radius)] [&::-webkit-details-marker]:hidden">
        <div>
          <span className="flex items-center gap-2 font-display text-base sm:text-lg font-medium text-[var(--color-foreground)]">
            {icon}
            {title}
          </span>
          {subtitle ? (
            <span className="block text-xs text-[var(--color-muted-foreground)] mt-0.5">
              {subtitle}
            </span>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-md bg-[var(--color-primary)] text-white text-xs font-medium group-open:bg-[var(--color-muted)] group-open:text-[var(--color-foreground)] transition-colors">
          <span className="group-open:hidden">{actionLabel}</span>
          <span className="hidden group-open:inline">Close form</span>
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>
      <div className="px-4 pb-4 sm:px-6 sm:pb-6 pt-4 border-t border-[var(--color-border)]">{children}</div>
    </details>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-12 px-4 text-center">
      {icon && (
        <div
          className="w-11 h-11 rounded-full bg-[var(--color-muted)] flex items-center justify-center text-[var(--color-muted-foreground)] mb-3.5"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Avatar({
  initials,
  src,
  size = "md",
  className,
}: {
  initials?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base" };

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn("rounded-full object-cover flex-shrink-0", sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-[var(--color-muted)] text-[var(--color-foreground)] border border-[var(--color-border)] font-medium flex items-center justify-center flex-shrink-0",
        sizeClasses[size],
        className
      )}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} />;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal-backdrop)] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-[#141C2B]/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative bg-[var(--card-bg)] border border-[var(--card-border)] rounded-t-xl sm:rounded-lg shadow-lg w-full max-h-[90vh] overflow-y-auto",
          sizeClasses[size]
        )}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--card-border)]">
          <h2 id="modal-title" className="font-display text-base sm:text-lg font-medium text-[var(--color-foreground)]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 rounded-md flex items-center justify-center text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
