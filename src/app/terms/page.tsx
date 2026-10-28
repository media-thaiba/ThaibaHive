import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — ThaibaHive",
  description: "Terms of Service and Acceptable Use Policy for ThaibaHive Platform.",
};

export default function TermsOfServicePage() {
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

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="space-y-3 pb-8 border-b border-border/60">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-500">
            <FileText className="h-3.5 w-3.5" />
            <span>Institutional User Agreement</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: <span className="font-semibold text-foreground">{lastUpdated}</span>
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed pt-1">
            These Terms of Service govern access to and usage of <strong>ThaibaHive</strong>,
            providing educational, administrative, and campus operational workflows for staff, students, and guardians.
          </p>
        </div>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground/90">
          <section className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using ThaibaHive, you agree to comply with and be bound by these Terms of Service. If you are accessing the platform on behalf of an affiliated school, institution, or department, you confirm you have proper authorization.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">2. Authorized Account Usage</h2>
            <p className="text-muted-foreground">
              User accounts are provided exclusively for authorized employees, faculty, students, and enrolled guardians of Thaiba Garden. You are responsible for safeguarding your credentials, passkeys, and two-factor authentication tokens. Account sharing outside of assigned duties is strictly prohibited.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">3. Federated Authentication (Google OAuth)</h2>
            <p className="text-muted-foreground">
              When authenticating via Google OAuth or institutional SSO, you authorize ThaibaHive to verify your institutional identity. Access will only be granted if your email corresponds to an active, verified profile in the Thaiba Garden directory.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">4. Acceptable Campus Use</h2>
            <p className="text-muted-foreground">
              Users agree not to submit fraudulent academic records, tamper with attendance logs, attempt privilege escalation, or transmit defamatory or unauthorized content through the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">5. Termination &amp; Suspension</h2>
            <p className="text-muted-foreground">
              Thaiba Garden reserves the right to suspend or terminate user accounts upon departure from the institution, expiration of enrollment, or in response to confirmed security violations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">6. Account Deletion &amp; Data Erasure</h2>
            <p className="text-muted-foreground">
              You may delete your own account at any time, without contacting support, from
              <strong> Settings → Privacy &amp; Account Deletion</strong> in the web or mobile app. Deletion revokes every active session immediately and anonymises non-statutory personal data. Records that Indian statute requires us to retain — payroll, income-tax and immutable audit records — are kept only for the statutory period. Full details are on the{" "}
              <Link href="/account-deletion" className="text-primary font-medium underline underline-offset-4">
                Account Deletion page
              </Link>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">7. Privacy, Cookies &amp; DPDP Compliance</h2>
            <p className="text-muted-foreground">
              Your personal data is processed in accordance with our{" "}
              <Link href="/privacy" className="text-primary font-medium underline underline-offset-4">
                Privacy Policy
              </Link>
              , our{" "}
              <Link href="/cookies" className="text-primary font-medium underline underline-offset-4">
                Cookie Policy
              </Link>{" "}
              and the Digital Personal Data Protection Act, 2023 — see the{" "}
              <Link href="/legal/dpdp-notice" className="text-primary font-medium underline underline-offset-4">
                DPDP data notice
              </Link>
              . Children&apos;s data is processed only with verifiable parental consent, and no child is
              tracked or behaviourally monitored. Consent for biometric or notification features may be
              withdrawn at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">8. Grievance Redressal</h2>
            <p className="text-muted-foreground">
              Complaints about these Terms or about the processing of personal data may be addressed to
              our Grievance Officer, who acknowledges grievances within 72 hours:
            </p>
            <div className="rounded-xl border border-border/60 bg-card p-4 text-xs space-y-1 text-muted-foreground">
              <p><strong className="text-foreground">Thaiba Garden Educational Institutions</strong></p>
              <p>Attn: Grievance Officer / Data Protection Officer</p>
              <p>Email: <a href="mailto:grievance@thaibahive.com" className="text-primary font-medium underline">grievance@thaibahive.com</a></p>
              <p>Postal: Grievance Officer, Thaiba Garden Educational Institutions, Thaiba Campus, Tamil Nadu, India — 600001</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">9. Contact Information</h2>
            <p className="text-muted-foreground">
              For questions regarding these Terms, contact administration at:
            </p>
            <div className="rounded-xl border border-border/60 bg-card p-4 text-xs space-y-1 text-muted-foreground">
              <p><strong className="text-foreground">Thaiba Garden Educational Institutions</strong></p>
              <p>Email: <a href="mailto:media@thaibagarden.com" className="text-primary font-medium underline">media@thaibagarden.com</a></p>
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
