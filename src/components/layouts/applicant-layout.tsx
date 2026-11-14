"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  User,
  Bell,
  LogOut,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";

const applicantNavItems = [
  { label: "Dashboard", href: "/applicant", icon: <LayoutDashboard className="h-5 w-5" aria-hidden="true" /> },
  { label: "My Applications", href: "/applicant/applications", icon: <FileText className="h-5 w-5" aria-hidden="true" /> },
  { label: "My Profile", href: "/applicant/profile", icon: <User className="h-5 w-5" aria-hidden="true" /> },
  { label: "Notifications", href: "/applicant/notifications", icon: <Bell className="h-5 w-5" aria-hidden="true" /> },
];

export function ApplicantLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { firstName: string; lastName: string; email: string };
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Top navigation bar */}
      <header className="sticky top-0 z-[var(--z-sticky)] bg-[var(--color-card)] border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/applicant" className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-md bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0"
                aria-hidden="true"
              >
                <span className="font-display font-semibold text-xs text-[#E8DEC8]">G&amp;G</span>
              </div>
              <div className="min-w-0">
                <span className="font-display font-semibold text-sm text-[var(--color-foreground)] tracking-tight block truncate leading-tight">
                  G&amp;G Manpower
                </span>
                <span className="block text-[11px] text-[var(--color-muted-foreground)]">
                  Applicant Portal
                </span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Applicant navigation">
              {applicantNavItems.map((item) => {
                const active = item.href === "/applicant"
                  ? pathname === "/applicant"
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "min-h-10 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
                      active
                        ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                        : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User actions */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 min-h-9 px-3 py-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-medium text-[var(--color-secondary)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Landing Page</span>
                <span className="sm:hidden">Home</span>
              </Link>
              <span className="hidden sm:block text-sm text-[var(--color-muted-foreground)] truncate max-w-[180px]">
                {user.firstName} {user.lastName}
              </span>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="min-h-11 min-w-11 sm:min-h-10 sm:min-w-10 flex items-center justify-center rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors cursor-pointer"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4.5 w-4.5" aria-hidden="true" />
                </button>
              </form>

              {/* Mobile menu */}
              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-expanded={mobileOpen}
                className="md:hidden min-h-11 min-w-11 flex items-center justify-center rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] cursor-pointer"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)] truncate">{user.email}</p>
            </div>
            <nav className="px-3 py-2 space-y-1" aria-label="Mobile applicant navigation">
              {applicantNavItems.map((item) => {
                const active = item.href === "/applicant"
                  ? pathname === "/applicant"
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                        : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
        {children}
      </main>
    </div>
  );
}
