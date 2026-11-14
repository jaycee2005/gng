"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { register } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Building2, AlertCircle, ArrowLeft } from "lucide-react";

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialPortal =
    searchParams.get("portal")?.toUpperCase() === "EMPLOYER"
      ? "EMPLOYER"
      : "APPLICANT";

  const [portal, setPortal] = useState<"APPLICANT" | "EMPLOYER">(initialPortal);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [state, formAction, isPending] = useActionState(register, undefined);

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between gap-3 mb-2.5">
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

        <h1 className="font-display text-2xl font-normal text-[var(--color-foreground)] leading-tight">
          Create your account
        </h1>
        <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
          Apply for open jobs or submit employer manpower requests.
        </p>
      </div>

      <div className="card p-4 sm:p-5">
        <fieldset className="mb-3">
          <legend className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1.5">
            Account type
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <label
              className={`min-h-9 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-accent)] ${
                portal === "APPLICANT"
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "bg-white text-[var(--color-secondary)] border-[var(--color-border)] hover:bg-[var(--color-muted)]"
              }`}
            >
              <input
                type="radio"
                name="portalClassificationSelector"
                value="APPLICANT"
                checked={portal === "APPLICANT"}
                onChange={() => setPortal("APPLICANT")}
                className="sr-only"
              />
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Job Applicant</span>
            </label>
            <label
              className={`min-h-9 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-accent)] ${
                portal === "EMPLOYER"
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "bg-white text-[var(--color-secondary)] border-[var(--color-border)] hover:bg-[var(--color-muted)]"
              }`}
            >
              <input
                type="radio"
                name="portalClassificationSelector"
                value="EMPLOYER"
                checked={portal === "EMPLOYER"}
                onChange={() => setPortal("EMPLOYER")}
                className="sr-only"
              />
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Employer Client</span>
            </label>
          </div>
        </fieldset>

        {state?.error && (
          <div
            className="mb-3 flex items-start gap-2 rounded-md border border-[#E2C2C2] bg-[#F6E6E6] px-3 py-2 text-xs text-[#8E2B2B]"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{state.error}</span>
          </div>
        )}

        <form action={formAction} className="space-y-2.5">
          <input type="hidden" name="portal" value={portal} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Input
              label="First name"
              name="firstName"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Juan"
            />
            <Input
              label="Last name"
              name="lastName"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Dela Cruz"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Input
              label="Email address"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="Mobile phone (PH)"
              name="phone"
              type="tel"
              required={smsConsent}
              pattern="^(\+[1-9]\d{6,14}|09\d{9}|639\d{9}|9\d{9})$"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09171234567"
            />
          </div>

          <Input
            label="Password (min. 8 characters)"
            name="password"
            type="password"
            required
            placeholder="••••••••"
          />

          {portal === "EMPLOYER" && (
            <div className="pt-2 border-t border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Input
                label="Company name"
                name="orgName"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="LIMA Manufacturing"
              />
              <Input
                label="Industry"
                name="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Manufacturing"
              />
              <Input
                label="Job title"
                name="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="HR Manager"
              />
            </div>
          )}

          <label className="flex items-start gap-2 pt-0.5 text-xs text-[var(--color-secondary)] cursor-pointer">
            <input
              type="checkbox"
              name="smsConsent"
              checked={smsConsent}
              onChange={(e) => setSmsConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-accent)] flex-shrink-0"
            />
            <span>
              Send me SMS job and dispatch alerts (reply STOP anytime to opt out).
            </span>
          </label>

          <Button type="submit" className="w-full" size="md" isLoading={isPending}>
            Create {portal === "APPLICANT" ? "Applicant" : "Employer"} Account
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-[var(--color-muted-foreground)]">
        Already have an account?{" "}
        <Link
          href={portal === "EMPLOYER" ? "/login?portal=EMPLOYER" : "/login"}
          className="font-medium text-[var(--color-accent)] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="card p-6 text-center text-sm">Loading registration…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
