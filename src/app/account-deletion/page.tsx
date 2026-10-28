import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Trash2, Clock, ShieldCheck, Scale, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Account Deletion — ThaibaHive",
  description:
    "How to delete your ThaibaHive account, what is removed immediately, and what Indian law requires us to retain.",
};

const retained = [
  {
    item: "Payroll, salary and statutory deduction records",
    period: "As required by the Income Tax Act, 1961 and applicable labour statutes",
  },
  {
    item: "Aadhaar, PAN, bank account and IFSC references used for payroll",
    period: "Encrypted at rest (AES-256-GCM) for the statutory financial retention window",
  },
  {
    item: "Audit logs and cryptographic (Merkle) audit chain entries",
    period: "10 years, immutable — required for tamper-evident governance",
  },
  {
    item: "Employment record basics (employee ID, joining date, designation)",
    period: "7 years from separation, for statutory employment verification",
  },
];

export default function AccountDeletionPage() {
  const lastUpdated = "October 27, 2026";

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-85"
            aria-label="ThaibaHive Home"
          >
            <img
              src="/Logo/thl_logo.svg"
              alt="ThaibaHive Logo"
              width={36}
              height={36}
              className="rounded-lg shadow-xs"
            />
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight">ThaibaHive</span>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Thaiba Family App
              </span>
            </div>
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/60 px-3.5 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to Sign In
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="space-y-3 pb-8 border-b border-border/60">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-500">
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Self-Service Account Deletion</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Delete Your Account
          </h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: <span className="font-semibold text-foreground">{lastUpdated}</span>
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed pt-1">
            You can delete your ThaibaHive account yourself, at any time, without contacting support.
            This page explains exactly what happens, what we must keep under Indian law, and how to
            reach our Grievance Officer if you disagree with any part of the outcome.
          </p>
        </div>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground/90">
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <ExternalLink className="h-5 w-5 text-primary" aria-hidden="true" />
              1. How to Delete Your Account
            </h2>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
              <li>
                Sign in to ThaibaHive on the web or in the mobile app.
              </li>
              <li>
                Open{" "}
                <strong className="text-foreground">Settings → Privacy &amp; Account Deletion</strong>
                .
              </li>
              <li>
                Choose <strong className="text-foreground">Delete My Account</strong> and confirm by
                entering your password. If you signed in with Google and have no local password,
                enter your account email address instead.
              </li>
              <li>
                Your account is closed immediately and every active session is revoked.
              </li>
            </ol>
            <p className="text-muted-foreground">
              In-app, the same action is available under{" "}
              <strong className="text-foreground">Settings → Privacy &amp; Account Deletion</strong>{" "}
              in the mobile application.
            </p>
            <Link
              href="/my-work/settings"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition-all hover:opacity-90"
            >
              Open Account Settings
            </Link>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              2. What Happens Immediately
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>All sessions and access tokens are revoked instantly (token version is bumped).</li>
              <li>The account is deactivated and removed from every active roster and workspace.</li>
              <li>
                Non-statutory personal data is anonymised: name, phone, date of birth, address
                contacts, avatar, biometric templates (face and fingerprint vectors), NFC card
                mapping and federated login identifiers are erased or replaced with a pseudonym.
              </li>
              <li>Application access assignments are revoked.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
              3. Records We Must Retain
            </h2>
            <p className="text-muted-foreground">
              Indian law obliges educational institutions and employers to keep certain records. Those
              records are retained for the statutory period and are never used for any new purpose:
            </p>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Record</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Retention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-muted-foreground">
                  {retained.map((row) => (
                    <tr key={row.item} className="align-top">
                      <td className="px-3 py-2.5 text-foreground">{row.item}</td>
                      <td className="px-3 py-2.5">{row.period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground">
              Non-statutory retained data is scheduled for permanent purge 30 days after the deletion
              request.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
              4. Other Ways to Ask for Erasure
            </h2>
            <p className="text-muted-foreground">
              If you cannot sign in, or you want access to, correction of, or erasure of data we hold
              about you under Section 11 and Section 12 of the Digital Personal Data Protection Act,
              2023, email our Grievance Officer. We acknowledge grievances within 72 hours and
              resolve them within the period prescribed by the Act.
            </p>
            <div className="rounded-xl border border-border/60 bg-card p-5 text-xs space-y-1.5 text-muted-foreground">
              <p>
                <strong className="text-foreground">Thaiba Garden Educational Institutions</strong>
              </p>
              <p>Attn: Grievance Officer / Data Protection Officer</p>
              <p>
                Email:{" "}
                <a
                  href="mailto:grievance@thaibahive.com"
                  className="text-primary font-medium underline"
                >
                  grievance@thaibahive.com
                </a>
              </p>
              <p>Postal: Grievance Officer, Thaiba Garden Educational Institutions, Thaiba Campus, Tamil Nadu, India — 600001</p>
            </div>
          </section>
        </div>

        <div className="mt-16 border-t border-border/40 pt-8 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Thaiba Garden. All rights reserved.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link href="/terms" className="hover:text-foreground">
              Terms of Service
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link href="/cookies" className="hover:text-foreground">
              Cookie Policy
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link href="/legal/dpdp-notice" className="hover:text-foreground">
              DPDP Notice
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link href="/auth/login" className="hover:text-foreground">
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
