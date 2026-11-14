import Link from "next/link";
import { getSessionUser, userPortals, PORTAL_HOME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/common";
import {
  ArrowRight,
  Building2,
  Clock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
} from "lucide-react";

const SERVICES = [
  {
    title: "Manpower Placement",
    detail: "Direct and contractual industrial staffing.",
  },
  {
    title: "Recruitment & Screening",
    detail: "Pre-vetted applicants across Batangas.",
  },
  {
    title: "Workforce Training",
    detail: "Safety and skills readiness before deployment.",
  },
  {
    title: "LIMA & Plant Dispatch",
    detail: "Multi-slot mobilization with SMS alerts.",
  },
];

const STEPS = [
  { step: "1. Job Order", detail: "Post roles, slots, and start date." },
  { step: "2. Shortlist", detail: "Review pre-screened applicants." },
  { step: "3. SMS Dispatch", detail: "Workers report on site on time." },
];

export default async function HomePage() {
  const [user, openRequests] = await Promise.all([
    getSessionUser(),
    prisma.employerRequest.findMany({
      where: { status: { in: ["APPROVED", "IN_PROGRESS"] } },
      include: { organization: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const primaryPortal = user ? [...userPortals(user)][0] : null;
  const totalOpenSlots = openRequests.reduce((sum, r) => sum + r.positions, 0);

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] flex flex-col">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            <div
              className="w-8 h-8 rounded-md bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <span className="font-display font-medium text-xs tracking-tight text-[#E8DEC8]">
                G&amp;G
              </span>
            </div>
            <span className="font-display font-medium text-base tracking-tight text-[var(--color-foreground)]">
              G&amp;G Manpower
            </span>
          </Link>

          <nav
            className="hidden md:flex items-center gap-7 text-sm text-[var(--color-muted-foreground)]"
            aria-label="Primary sections"
          >
            <a href="#open-jobs" className="hover:text-[var(--color-foreground)] transition-colors tabular-nums">
              Jobs ({openRequests.length})
            </a>
            <a href="#services" className="hover:text-[var(--color-foreground)] transition-colors">
              Services
            </a>
            <a href="#portals" className="hover:text-[var(--color-foreground)] transition-colors">
              Portals
            </a>
          </nav>

          <div className="flex items-center gap-2">
            {primaryPortal ? (
              <Link
                href={PORTAL_HOME[primaryPortal]}
                className="inline-flex items-center gap-1.5 min-h-9 px-4 rounded-[var(--button-radius)] bg-[var(--color-primary)] text-white text-xs sm:text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                My Portal
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center min-h-9 px-3 rounded-[var(--button-radius)] text-xs sm:text-sm font-medium text-[var(--color-secondary)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center min-h-9 px-4 rounded-[var(--button-radius)] bg-[var(--color-primary)] text-white text-xs sm:text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  Apply / Hire
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="py-12 sm:py-16 lg:py-20 border-b border-[var(--color-border)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6">
              <h1 className="font-display text-4xl sm:text-5xl font-normal tracking-[-0.02em] text-[var(--color-foreground)] leading-[1.1] text-balance">
                Skilled people. Ready for site.
              </h1>

              <p className="mt-4 text-base text-[var(--color-muted-foreground)] leading-relaxed max-w-md">
                Industrial and manufacturing staffing across Batangas, LIMA Technology Center, and CALABARZON.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="#open-jobs"
                  className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-[var(--button-radius)] bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors tabular-nums"
                >
                  <span>Browse Jobs ({totalOpenSlots} Slots)</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <Link
                  href="/login?portal=EMPLOYER"
                  className="inline-flex items-center justify-center min-h-11 px-5 rounded-[var(--button-radius)] border border-[var(--color-border)] bg-white text-[var(--color-foreground)] text-sm font-medium hover:bg-[var(--color-muted)] transition-colors"
                >
                  Hire Workers
                </Link>
              </div>

              <p className="mt-6 text-xs text-[var(--color-muted-foreground)] flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>Tanauan City, Batangas</span>
                <span aria-hidden="true">•</span>
                <a href="tel:+63437848063" className="hover:text-[var(--color-foreground)]">
                  +63 43 784 8063
                </a>
              </p>
            </div>

            <div className="lg:col-span-6">
              <figure className="space-y-2.5">
                <div className="aspect-[16/10] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] overflow-hidden">
                  <img
                    src="/images/hero-workforce.jpg"
                    alt="Filipino industrial technicians and plant engineer reviewing operations inside a CALABARZON facility"
                    className="w-full h-full object-cover"
                  />
                </div>
                <figcaption className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)] px-0.5">
                  <span>Industrial &amp; Manufacturing Deployment</span>
                  <span>CALABARZON</span>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* Active Job Openings — Editorial Ledger */}
        <section id="open-jobs" className="py-12 sm:py-16 border-b border-[var(--color-border)] bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-normal text-[var(--color-foreground)]">
                  Open Job Orders
                </h2>
              </div>
              <Link
                href="/login?portal=APPLICANT"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[var(--color-accent)] hover:underline"
              >
                <span>Applicant sign in</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            {openRequests.length === 0 ? (
              <div className="border border-[var(--color-border)] rounded-lg p-8 text-center text-sm text-[var(--color-muted-foreground)]">
                No open job orders right now.{" "}
                <Link href="/register" className="text-[var(--color-accent)] hover:underline">
                  Register your profile
                </Link>{" "}
                for upcoming slots.
              </div>
            ) : (
              <div className="border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)] bg-[var(--color-background)]/40">
                {openRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--color-muted)]/40 transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-display text-lg font-medium text-[var(--color-foreground)]">
                          {req.title}
                        </h3>
                        <Badge variant="status" status={req.urgency}>
                          {req.urgency}
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {req.organization.name} • {req.positions} slot{req.positions > 1 ? "s" : ""} • Start:{" "}
                        {req.startDate ? formatDate(req.startDate) : "Immediate"}
                      </p>
                    </div>

                    <Link
                      href="/login?portal=APPLICANT&next=/applicant/applications"
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[var(--color-accent)] hover:underline flex-shrink-0"
                    >
                      <span>Apply</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Services & Tanauan Office — Asymmetric Editorial Split */}
        <section id="services" className="py-12 sm:py-16 border-b border-[var(--color-border)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Left: Office Photo & Details */}
            <div className="lg:col-span-5 space-y-4">
              <div className="aspect-[16/10] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] overflow-hidden">
                <img
                  src="/images/office-screening.jpg"
                  alt="G&G Manpower coordinator interviewing a job applicant at the Tanauan City office"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-2 text-xs text-[var(--color-secondary)]">
                <h2 className="font-display text-lg font-medium text-[var(--color-foreground)]">
                  Tanauan City Office
                </h2>
                <p className="flex items-start gap-2 leading-relaxed">
                  <MapPin className="h-3.5 w-3.5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    2F Premium Bikes Bldg., Pres. Jose P. Laurel Hwy, Brgy. Darasa, Tanauan City, Batangas
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-[var(--color-accent)] flex-shrink-0" aria-hidden="true" />
                  <span>Walk-in screening: Mon–Fri, 8:00 AM – 5:00 PM</span>
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                  <a
                    href="tel:+63437848063"
                    className="inline-flex items-center gap-1.5 font-medium text-[var(--color-foreground)] hover:text-[var(--color-accent)]"
                  >
                    <Phone className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden="true" />
                    +63 43 784 8063
                  </a>
                  <a
                    href="mailto:gandgmps@gmail.com"
                    className="inline-flex items-center gap-1.5 hover:text-[var(--color-accent)]"
                  >
                    <Mail className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden="true" />
                    gandgmps@gmail.com
                  </a>
                </div>
              </div>
            </div>

            {/* Right: Services List + 3-Step Flow */}
            <div className="lg:col-span-7 space-y-10">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-normal text-[var(--color-foreground)] mb-4">
                  Services
                </h2>
                <dl className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                  {SERVICES.map((svc) => (
                    <div
                      key={svc.title}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-6"
                    >
                      <dt className="font-medium text-sm text-[var(--color-foreground)]">
                        {svc.title}
                      </dt>
                      <dd className="text-xs sm:text-sm text-[var(--color-muted-foreground)]">
                        {svc.detail}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div>
                <h3 className="font-display text-xl font-normal text-[var(--color-foreground)] mb-4">
                  How It Works
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {STEPS.map((item) => (
                    <div key={item.step} className="border-t border-[var(--color-border)] pt-3">
                      <p className="text-sm font-medium text-[var(--color-foreground)]">
                        {item.step}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Portals */}
        <section id="portals" className="py-12 sm:py-16 bg-white border-b border-[var(--color-border)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-2xl sm:text-3xl font-normal text-[var(--color-foreground)]">
                Portals
              </h2>
              <Link
                href="/register"
                className="text-xs sm:text-sm font-medium text-[var(--color-accent)] hover:underline"
              >
                New account →
              </Link>
            </div>

            <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
              <Link
                href="/login?portal=APPLICANT"
                className="py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6 hover:bg-[var(--color-background)]/60 px-2 -mx-2 rounded-md transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 sm:w-56 flex-shrink-0">
                  <Users className="h-4 w-4 text-[var(--color-accent)] flex-shrink-0" aria-hidden="true" />
                  <span className="font-display text-lg font-medium text-[var(--color-foreground)]">
                    Job Applicant
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] flex-1">
                  Apply to open jobs and receive SMS dispatch updates.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[var(--color-accent)] group-hover:underline flex-shrink-0">
                  Enter portal <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>

              <Link
                href="/login?portal=EMPLOYER"
                className="py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6 hover:bg-[var(--color-background)]/60 px-2 -mx-2 rounded-md transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 sm:w-56 flex-shrink-0">
                  <Building2 className="h-4 w-4 text-[var(--color-accent)] flex-shrink-0" aria-hidden="true" />
                  <span className="font-display text-lg font-medium text-[var(--color-foreground)]">
                    Employer Client
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] flex-1">
                  Submit job orders and review shortlisted candidates.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[var(--color-accent)] group-hover:underline flex-shrink-0">
                  Enter portal <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>

              <Link
                href="/login?portal=ADMIN"
                className="py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6 hover:bg-[var(--color-background)]/60 px-2 -mx-2 rounded-md transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 sm:w-56 flex-shrink-0">
                  <ShieldCheck className="h-4 w-4 text-[var(--color-accent)] flex-shrink-0" aria-hidden="true" />
                  <span className="font-display text-lg font-medium text-[var(--color-foreground)]">
                    Agency Staff
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] flex-1">
                  Screen applicants, manage orders, and dispatch workers.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[var(--color-accent)] group-hover:underline flex-shrink-0">
                  Enter portal <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[var(--color-background)] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[var(--color-muted-foreground)]">
          <div className="space-y-0.5">
            <span className="font-medium text-[var(--color-foreground)] block">
              G&amp;G Manpower &amp; Professional Services
            </span>
            <span>Managing Director: Marcelino de Lima • CALABARZON</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a href="tel:+63437848063" className="hover:text-[var(--color-foreground)]">
              +63 43 784 8063
            </a>
            <a href="mailto:gandgmps@gmail.com" className="hover:text-[var(--color-foreground)]">
              gandgmps@gmail.com
            </a>
            <a
              href="https://www.facebook.com/p/GG-Manpower-and-Professional-Services-61577811484007/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              Facebook
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
