"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Users, Building2, AlertCircle, ArrowLeft } from "lucide-react";

type PortalOption = "ADMIN" | "APPLICANT" | "EMPLOYER";

const PORTAL_META: Record<
  PortalOption,
  { label: string; subtitle: string; demoEmail: string; icon: React.ReactNode }
> = {
  ADMIN: {
    label: "Admin / Staff",
    subtitle: "Manage job orders, screen applicants, and dispatch workers via SMS.",
    demoEmail: "admin@consultpro.com",
    icon: <ShieldCheck className="h-4 w-4 flex-shrink-0" aria-hidden="true" />,
  },
  APPLICANT: {
    label: "Applicant",
    subtitle: "Apply to open jobs, update your skills, and view deployment schedules.",
    demoEmail: "applicant@example.com",
    icon: <Users className="h-4 w-4 flex-shrink-0" aria-hidden="true" />,
  },
  EMPLOYER: {
    label: "Employer",
    subtitle: "Submit manpower requests and review pre-screened candidates.",
    demoEmail: "employer@acme.example.com",
    icon: <Building2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />,
  },
};

function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "";
  const initialPortalParam = (searchParams.get("portal")?.toUpperCase() ?? "") as PortalOption;

  const inferredPortal: PortalOption =
    initialPortalParam in PORTAL_META
      ? initialPortalParam
      : nextPath.startsWith("/applicant")
        ? "APPLICANT"
        : nextPath.startsWith("/employer")
          ? "EMPLOYER"
          : "ADMIN";

  const [portal, setPortal] = useState<PortalOption>(inferredPortal);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, formAction, isPending] = useActionState(login, undefined);

  const fillDemo = (targetPortal: PortalOption, customEmail?: string) => {
    setPortal(targetPortal);
    setEmail(customEmail ?? PORTAL_META[targetPortal].demoEmail);
    setPassword("Password123!");
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 min-h-8 px-3 py-1 rounded-md border border-[var(--color-border)] bg-white text-xs font-medium text-[var(--color-secondary)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Landing</span>
          </Link>

          <Link href="/" className="inline-flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md bg-[var(--color-primary)] flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="font-display font-medium text-[11px] text-[#E8DEC8]">G&amp;G</span>
            </div>
            <span className="hidden sm:inline font-display font-medium text-sm text-[var(--color-foreground)]">
              G&amp;G Manpower
            </span>
          </Link>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-normal text-[var(--color-foreground)]">
          Sign in to your portal
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[var(--color-muted-foreground)]">
          {PORTAL_META[portal].subtitle}
        </p>
      </div>

      {nextPath && (
        <div className="rounded-md border border-[#C6D9E6] bg-[#E6EFF4] px-3.5 py-2.5 text-xs text-[#1E4E68]">
          Sign in below to open the requested portal page.
        </div>
      )}

      <div className="card p-5 sm:p-6">
        {/* Portal Workspace Radio Group */}
        <fieldset className="mb-5">
          <legend className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-2">
            Portal workspace
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PORTAL_META) as PortalOption[]).map((key) => {
              const active = portal === key;
              return (
                <label
                  key={key}
                  className={`min-h-10 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md text-xs font-medium border transition-colors cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-accent)] ${
                    active
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "bg-white text-[var(--color-secondary)] border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="portalWorkspaceSelector"
                    value={key}
                    checked={active}
                    onChange={() => setPortal(key)}
                    className="sr-only"
                  />
                  {PORTAL_META[key].icon}
                  <span className="truncate">{PORTAL_META[key].label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {state?.error && (
          <div
            className="mb-5 flex items-start gap-2 rounded-md border border-[#E2C2C2] bg-[#F6E6E6] px-3.5 py-2.5 text-xs text-[#8E2B2B]"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{state.error}</span>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="portal" value={portal} />
          <input type="hidden" name="next" value={nextPath} />

          <Input
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@organization.com"
          />

          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Button type="submit" className="w-full" size="lg" isLoading={isPending}>
            Enter {PORTAL_META[portal].label} Portal
          </Button>
        </form>

        {/* Quiet Demo Credential Fillers */}
        <div className="mt-6 pt-5 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
              Demo accounts (click to fill)
            </p>
            <span className="text-[11px] font-mono text-[var(--color-muted-foreground)]">
              Password123!
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemo("ADMIN", "admin@consultpro.com")}
              className="min-h-10 px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-muted)] text-left cursor-pointer transition-colors"
            >
              <span className="font-medium block text-[var(--color-foreground)]">Admin</span>
              <span className="text-[var(--color-muted-foreground)] font-mono text-[11px] block truncate">
                admin@consultpro.com
              </span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("ADMIN", "staff@consultpro.com")}
              className="min-h-10 px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-muted)] text-left cursor-pointer transition-colors"
            >
              <span className="font-medium block text-[var(--color-foreground)]">Operations Staff</span>
              <span className="text-[var(--color-muted-foreground)] font-mono text-[11px] block truncate">
                staff@consultpro.com
              </span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("APPLICANT", "applicant@example.com")}
              className="min-h-10 px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-muted)] text-left cursor-pointer transition-colors"
            >
              <span className="font-medium block text-[var(--color-foreground)]">Job Applicant</span>
              <span className="text-[var(--color-muted-foreground)] font-mono text-[11px] block truncate">
                applicant@example.com
              </span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("EMPLOYER", "employer@acme.example.com")}
              className="min-h-10 px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] hover:bg-[var(--color-muted)] text-left cursor-pointer transition-colors"
            >
              <span className="font-medium block text-[var(--color-foreground)]">Employer Client</span>
              <span className="text-[var(--color-muted-foreground)] font-mono text-[11px] block truncate">
                employer@acme.example.com
              </span>
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-xs sm:text-sm text-[var(--color-muted-foreground)]">
        New applicant or employer client?{" "}
        <Link
          href={portal === "EMPLOYER" ? "/register?portal=EMPLOYER" : "/register"}
          className="font-medium text-[var(--color-accent)] hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="card p-8 text-center text-sm">Loading sign-in…</div>}>
      <LoginForm />
    </Suspense>
  );
}
