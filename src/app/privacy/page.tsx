import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Eye,
  Server,
  RefreshCw,
  Mail,
  Baby,
  UserCheck,
  Clock,
  Building2,
  Gavel,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — ThaibaHive",
  description: "Privacy Policy and Google API User Data Policy Compliance for ThaibaHive Campus Operating System.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "October 27, 2026";

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
              <strong>Self-Service Deletion:</strong> You can delete your own account at any time from
              <strong> Settings → Privacy &amp; Account Deletion</strong>. Deletion revokes every active session immediately and
              anonymises non-statutory personal data. See the{" "}
              <Link href="/account-deletion" className="text-primary font-medium underline">
                Account Deletion page
              </Link>{" "}
              for exactly what is removed and what Indian law requires us to retain.
            </p>
            <p className="text-muted-foreground">
              <strong>Other Requests:</strong> To request access to, correction of, or erasure of stored data beyond self-service
              deletion, contact our Data Protection Officer at{" "}
              <a href="mailto:grievance@thaibahive.com" className="text-primary font-medium underline">
                grievance@thaibahive.com
              </a>
              .
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <UserCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              5. Your Rights as a Data Principal (DPDP Act, 2023)
            </h2>
            <p className="text-muted-foreground">
              Under the Digital Personal Data Protection Act, 2023 you have the following rights, which
              we honour without undue delay:
            </p>
            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Access &amp; Summary</h3>
                <p className="text-xs text-muted-foreground">Obtain a summary of the personal data we process about you and of our processing activities (Section 11).</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Correction &amp; Erasure</h3>
                <p className="text-xs text-muted-foreground">Have inaccurate data corrected and have data erased where it is no longer necessary for the purpose it was collected (Section 11).</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Withdrawal of Consent</h3>
                <p className="text-xs text-muted-foreground">Withdraw consent for biometric punch, meal notifications or any other consent-based processing at any time, with no detriment.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">Grievance Redressal</h3>
                <p className="text-xs text-muted-foreground">Lodge a grievance with our Grievance Officer and escalate to the Data Protection Board of India if unsatisfied (Section 13).</p>
              </div>
            </div>
            <p className="text-muted-foreground pt-2">
              Full details of these rights are set out in the{" "}
              <Link href="/legal/dpdp-notice" className="text-primary font-medium underline">
                DPDP Act 2023 Data Notice
              </Link>
              .
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Baby className="h-5 w-5 text-primary" aria-hidden="true" />
              6. Children&apos;s Personal Data (Section 9)
            </h2>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2 text-muted-foreground">
              <p className="text-xs text-foreground font-semibold uppercase tracking-wider">
                Verifiable Parental Consent is mandatory
              </p>
              <p className="text-xs leading-relaxed">
                We do not process a child&apos;s personal data without verifiable parental or lawful-guardian
                consent, and we do not track children, monitor their behaviour, or direct targeted
                advertising to them.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs">
                <li>Student facial-recognition enrolment is <strong className="text-foreground">off by default</strong> and requires recorded guardian consent through the <code className="rounded bg-muted px-1 py-0.5">student_guardians</code> linkage.</li>
                <li>Surveillance consent for minors defaults to <strong className="text-foreground">refused</strong>, never assumed.</li>
                <li>Guardians may withdraw consent at any time, after which biometric templates are purged.</li>
              </ul>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
              7. Retention Schedule
            </h2>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-semibold text-foreground">Category</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold text-foreground">Retention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-muted-foreground">
                  <tr className="align-top">
                    <td className="px-3 py-2.5">Student academic records</td>
                    <td className="px-3 py-2.5">Graduation + 5 years, then anonymised for archival statistics</td>
                  </tr>
                  <tr className="align-top">
                    <td className="px-3 py-2.5">Employment record basics (employee ID, joining date, designation)</td>
                    <td className="px-3 py-2.5">Tenure + 7 years (statutory employment retention)</td>
                  </tr>
                  <tr className="align-top">
                    <td className="px-3 py-2.5">Aadhaar, PAN, bank account, IFSC used for payroll</td>
                    <td className="px-3 py-2.5">Tenure + 10 years (Income Tax Act, 1961), encrypted with AES-256-GCM</td>
                  </tr>
                  <tr className="align-top">
                    <td className="px-3 py-2.5">Biometric templates (face vectors, fingerprint hashes)</td>
                    <td className="px-3 py-2.5">Active enrolment only; purged immediately on unenrolment or consent withdrawal</td>
                  </tr>
                  <tr className="align-top">
                    <td className="px-3 py-2.5">CCTV frames, licence plates, geofence punch coordinates</td>
                    <td className="px-3 py-2.5">7–30 day rolling window with automated purge</td>
                  </tr>
                  <tr className="align-top">
                    <td className="px-3 py-2.5">Audit logs and cryptographic audit chain</td>
                    <td className="px-3 py-2.5">10 years, append-only and tamper-evident; never edited or deleted</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
              8. Third-Party Subprocessors
            </h2>
            <p className="text-muted-foreground">
              We share the minimum data necessary with the subprocessors below. We do not sell personal
              data and do not permit subprocessors to use it for their own advertising.
            </p>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-semibold text-foreground">Provider</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold text-foreground">Data Shared</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold text-foreground">Purpose</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold text-foreground">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-muted-foreground">
                  <tr className="align-top">
                    <td className="px-3 py-2.5">Firebase Cloud Messaging</td>
                    <td className="px-3 py-2.5">Device tokens, notification payloads</td>
                    <td className="px-3 py-2.5">Push notifications</td>
                    <td className="px-3 py-2.5">Google Cloud (multi-region)</td>
                  </tr>
                  <tr className="align-top">
                    <td className="px-3 py-2.5">Sentry</td>
                    <td className="px-3 py-2.5">Stack traces, device model, OS version (PII scrubbing enabled)</td>
                    <td className="px-3 py-2.5">Crash &amp; error reporting</td>
                    <td className="px-3 py-2.5">Sentry Cloud</td>
                  </tr>
                  <tr className="align-top">
                    <td className="px-3 py-2.5">Resend</td>
                    <td className="px-3 py-2.5">Staff/student email addresses</td>
                    <td className="px-3 py-2.5">Transactional verification mail</td>
                    <td className="px-3 py-2.5">AWS (us-east)</td>
                  </tr>
                  <tr className="align-top">
                    <td className="px-3 py-2.5">Google Identity Services</td>
                    <td className="px-3 py-2.5">Google account ID, email, display name, avatar URL</td>
                    <td className="px-3 py-2.5">Federated sign-in</td>
                    <td className="px-3 py-2.5">Google Cloud</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground pt-1">
              Browser storage used by these integrations is described in the{" "}
              <Link href="/cookies" className="text-primary font-medium underline">
                Cookie Policy
              </Link>
              .
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Gavel className="h-5 w-5 text-primary" aria-hidden="true" />
              9. Grievance Officer (Section 13)
            </h2>
            <p className="text-muted-foreground">
              In accordance with Section 13 of the Digital Personal Data Protection Act, 2023, we have
              designated the following Grievance Officer. Grievances are acknowledged within 72 hours
              and resolved within the period prescribed by the Act.
            </p>
            <div className="rounded-xl border border-border/60 bg-card p-5 text-xs space-y-1.5 text-muted-foreground">
              <p><strong className="text-foreground">Name: Grievance Officer, Thaiba Garden Educational Institutions</strong></p>
              <p>Email: <a href="mailto:grievance@thaibahive.com" className="text-primary font-medium underline">grievance@thaibahive.com</a></p>
              <p>Postal: Grievance Officer, Thaiba Garden Educational Institutions, Thaiba Campus, Tamil Nadu, India — 600001</p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Mail className="h-5 w-5 text-primary" />
              10. Contact Us
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
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <span>&bull;</span>
            <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
            <span>&bull;</span>
            <Link href="/cookies" className="hover:text-foreground">Cookie Policy</Link>
            <span>&bull;</span>
            <Link href="/legal/dpdp-notice" className="hover:text-foreground">DPDP Notice</Link>
            <span>&bull;</span>
            <Link href="/account-deletion" className="hover:text-foreground">Account Deletion</Link>
            <span>&bull;</span>
            <Link href="/auth/login" className="hover:text-foreground">Sign In</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
