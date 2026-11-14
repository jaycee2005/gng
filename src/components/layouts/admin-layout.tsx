"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Send,
  Settings,
  Shield,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/common";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
}

const adminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="h-5 w-5" aria-hidden="true" /> },
  { label: "Requests", href: "/admin/requests", icon: <FileText className="h-5 w-5" aria-hidden="true" /> },
  { label: "Applications", href: "/admin/applications", icon: <ClipboardList className="h-5 w-5" aria-hidden="true" /> },
  { label: "Applicants", href: "/admin/applicants", icon: <Users className="h-5 w-5" aria-hidden="true" /> },
  { label: "Employers", href: "/admin/employers", icon: <Building2 className="h-5 w-5" aria-hidden="true" /> },
  {
    label: "Dispatch",
    href: "/admin/dispatch",
    icon: <Send className="h-5 w-5" aria-hidden="true" />,
    children: [
      { label: "Assignments", href: "/admin/dispatch" },
      { label: "Notifications", href: "/admin/dispatch/notifications" },
    ],
  },
  { label: "Audit Log", href: "/admin/audit", icon: <Shield className="h-5 w-5" aria-hidden="true" /> },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: <Settings className="h-5 w-5" aria-hidden="true" />,
    children: [
      { label: "Overview", href: "/admin/settings" },
      { label: "Roles & Permissions", href: "/admin/settings/roles" },
      { label: "Notification Rules", href: "/admin/settings/notifications" },
      { label: "Templates", href: "/admin/settings/templates" },
    ],
  },
];

export function AdminSidebar({ user }: { user: { firstName: string; lastName: string; email: string } }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Dispatch"]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const navContent = (
    <>
      {/* Logo area */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-white/10">
        <Link
          href="/admin"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3"
        >
          <div
            className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            <span className="font-display font-semibold text-xs text-[#E8DEC8]">G&amp;G</span>
          </div>
          <div>
            <span className="font-display text-white font-semibold text-sm tracking-tight block leading-tight">
              G&amp;G Manpower
            </span>
            <span className="block text-[11px] text-white/60">
              Operations Suite
            </span>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden min-h-11 min-w-11 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1" aria-label="Admin navigation">
        {adminNavItems.map((item) => {
          const active = isActive(item.href);
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems.includes(item.label) || active;

          return (
            <div key={item.label}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(item.label)}
                  aria-expanded={isExpanded}
                  className={cn(
                    "w-full min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </button>
              ) : (
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )}

              {/* Sub-items */}
              {hasChildren && isExpanded && (
                <div className="ml-8 mt-1 space-y-0.5 border-l border-white/15 pl-2">
                  {item.children!.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "min-h-10 flex items-center px-3 py-2 rounded-md text-sm transition-colors duration-200",
                        pathname === child.href
                          ? "text-white font-semibold bg-white/10"
                          : "text-white/65 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-4 space-y-3">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="w-full min-h-10 flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-white/60" aria-hidden="true" />
          <span>Back to Landing Page</span>
        </Link>
        <div className="flex items-center gap-3">
          <Avatar initials={`${user.firstName[0]}${user.lastName[0]}`} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-white/60 truncate">{user.email}</p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile / Tablet Sticky Top Bar */}
      <div className="lg:hidden sticky top-0 z-30 h-14 bg-[var(--sidebar-bg)] text-white flex items-center justify-between px-4 border-b border-white/10 shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            className="min-h-11 min-w-11 -ml-2 rounded-lg flex items-center justify-center text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
          <Link href="/admin" className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="font-display font-semibold text-[10px] text-[#E8DEC8]">G&amp;G</span>
            </div>
            <span className="font-display font-semibold text-sm tracking-tight">G&amp;G Operations</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Avatar initials={`${user.firstName[0]}${user.lastName[0]}`} size="sm" />
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="min-h-11 min-w-11 -mr-2 rounded-lg flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-[var(--sidebar-bg)] flex flex-col z-50 transition-transform duration-300",
          "w-[280px] sm:w-[var(--sidebar-width)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}

export function AdminHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <header className="min-h-[var(--header-height)] bg-[var(--header-bg)] border-b border-[var(--header-border)] flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:sticky lg:top-0 z-[var(--z-sticky)]">
      <h1 className="font-display text-lg sm:text-xl font-medium text-[var(--color-foreground)] leading-snug break-words">
        {title}
      </h1>
      <div className="flex flex-wrap items-center gap-2.5">
        {actions}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 min-h-9 px-3 py-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-xs font-medium text-[var(--color-secondary)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Landing Page</span>
        </Link>
      </div>
    </header>
  );
}

export function AdminLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { firstName: string; lastName: string; email: string };
}) {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <AdminSidebar user={user} />
      <div className="lg:ml-[var(--sidebar-width)] min-w-0">
        <main id="main-content" className="min-h-screen min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
