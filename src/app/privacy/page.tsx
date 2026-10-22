import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Eye, Server, RefreshCw, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — ThaibaHive",
  description: "Privacy Policy and Google API User Data Policy Compliance for ThaibaHive Campus Operating System.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "October 22, 2026";

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-85"
            aria-label="ThaibaHive Home"
          >
            <img src="/Logo/thl_logo.svg" alt="ThaibaHive Logo" width={36} height={36} className="rounded-lg shadow-xs" />
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight">ThaibaHive</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Thaiba Family App</span>
            </div>
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/60 px-3.5 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="space-y-3 pb-8 border-b border-border/60">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Privacy & Data Protection Notice</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: <span className="font-semibold text-foreground">{lastUpdated}</span>
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed pt-1">
            This Privacy Policy explains how <strong>ThaibaHive</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Platform&rdquo;),
            operated by Thaiba Garden Educational Institutions, collects, uses, protects, and discloses personal information
            when you use our web platform, mobile applications, and administrative systems.
          </p>
        </div>

        {/* Content Sections */}
        <div className="mt-10 space-y-12 text-sm leading-relaxed text-foreground/90">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Eye className="h-5 w-5 text-primary" />
              1. Information We Collect
            </h2>
            <p className="text-muted-foreground">
              We collect only the information necessary to provide institutional identity management, academic management, and campus operational services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Account and Institutional Identity:</strong> Full name, institutional email address, employee ID, student ID, department affiliation, and designated organizational role.
              </li>
              <li>
                <strong className="text-foreground">Google OAuth Information:</strong> When you choose to sign in via Google, we receive your Google account ID, primary email address, full name, and profile photo URL. We do not access your Google contacts, Drive files, or calendar without explicit, separate authorization.
              </li>
              <li>
                <strong className="text-foreground">Academic and Campus Operational Records:</strong> Attendance logs, class assignments, course schedules, examination marks, grievance and inquiry reports, and campus facility requests.
              </li>
              <li>
                <strong className="text-foreground">Technical and Device Telemetry:</strong> Log data including IP address, user agent, browser version, and cryptographic authentication tokens required for multi-factor verification (WebAuthn/Passkeys and DPoP tokens).
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Lock className="h-5 w-5 text-primary" />
              2. How We Use Your Information
            </h2>
            <p className="text-muted-foreground">We use your information exclusively for legitimate institutional purposes:</p>
            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Authentication & Access</h3>
                <p className="text-xs text-muted-foreground">Verifying staff, student, and guardian identities and enforcing fine-grained role-based permissions (RBAC).</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Campus Operations</h3>
                <p className="text-xs text-muted-foreground">Managing timetable scheduling, academic grades, leave processing, asset management, and campus security.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Security & Integrity</h3>
                <p className="text-xs text-muted-foreground">Detecting unauthorized account access, cryptographic tampering, and maintaining immutable audit trails.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Communications</h3>
                <p className="text-xs text-muted-foreground">Sending emergency circulars, administrative alerts, password resets, and account verification emails.</p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Server className="h-5 w-5 text-primary" />
              3. Google API User Data Policy Compliance
            </h2>
            <p className="text-muted-foreground">
              ThaibaHive&rsquo;s use and transfer to any other app of information received from Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements:
            </p>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <p className="text-xs text-foreground font-medium">
                • <strong>Limited Scope Access:</strong> We strictly request read-only access to basic profile info (<code className="rounded bg-muted px-1 py-0.5 text-[11px]">openid</code>, <code className="rounded bg-muted px-1 py-0.5 text-[11px]">userinfo.email</code>, <code className="rounded bg-muted px-1 py-0.5 text-[11px]">userinfo.profile</code>) solely to authenticate approved users into the campus system.
              </p>
              <p className="text-xs text-foreground font-medium">
                • <strong>No Advertising &amp; No Data Brokering:</strong> We never sell, lease, or monetize your Google account data, and we do not use your information for targeted advertising or third-party behavioral profiling.
              </p>
              <p className="text-xs text-foreground font-medium">
                • <strong>No AI Training on Google User Data:</strong> User data retrieved from Google APIs is never utilized to train generalized artificial intelligence or machine learning foundation models.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <RefreshCw className="h-5 w-5 text-primary" />
              4. Data Retention, Sharing &amp; Deletion
            </h2>
            <p className="text-muted-foreground">
              Personal data is retained only for the duration of an employee&rsquo;s or student&rsquo;s active institutional enrollment,
              plus any statutory educational archiving duration mandated by local educational laws.
            </p>
            <p className="text-muted-foreground">
              <strong>Data Deletion Requests:</strong> You have the right to request access to or permanent deletion of your account
              and associated personal data. To submit a deletion request or inquire about stored data, contact our data administration
              officer at <a href="mailto:media@thaibagarden.com" className="text-primary font-medium underline">media@thaibagarden.com</a>.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Mail className="h-5 w-5 text-primary" />
              5. Contact Us
            </h2>
            <p className="text-muted-foreground">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our security practices, please contact us:
            </p>
            <div className="rounded-xl border border-border/60 bg-card p-5 text-xs space-y-1.5 text-muted-foreground">
              <p><strong className="text-foreground">Thaiba Garden Educational Institutions</strong></p>
              <p>Attn: Data Protection Officer / Platform Administration</p>
              <p>Email: <a href="mailto:media@thaibagarden.com" className="text-primary font-medium underline">media@thaibagarden.com</a></p>
              <p>Developer Contact: <a href="mailto:asnk633@gmail.com" className="text-primary font-medium underline">asnk633@gmail.com</a></p>
              <p>Platform: <a href="https://thaiba-hive.vercel.app" className="text-primary font-medium underline">https://thaiba-hive.vercel.app</a></p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 border-t border-border/40 pt-8 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Thaiba Garden. All rights reserved.</p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <span>&bull;</span>
            <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
            <span>&bull;</span>
            <Link href="/auth/login" className="hover:text-foreground">Sign In</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
