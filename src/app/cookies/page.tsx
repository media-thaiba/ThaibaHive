import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Cookie, ShieldCheck, Settings2, Ban } from "lucide-react";

export const metadata: Metadata = {
  title: "Cookie Policy — ThaibaHive",
  description:
    "Cookie, localStorage and browser storage policy for the ThaibaHive Campus Operating System.",
};

const rows: Array<{
  name: string;
  type: string;
  purpose: string;
  duration: string;
  essential: boolean;
}> = [
  {
    name: "thaibahive_session",
    type: "HTTP cookie (HttpOnly, Secure, SameSite=Lax)",
    purpose:
      "Holds your signed session token so you stay signed in and so the server can verify your identity and role on every request.",
    duration: "Session lifetime; cleared on sign out or account deletion",
    essential: true,
  },
  {
    name: "theme",
    type: "localStorage",
    purpose: "Remembers your light or dark appearance preference between visits.",
    duration: "Until you clear browser storage",
    essential: false,
  },
  {
    name: "notification_preferences",
    type: "localStorage",
    purpose:
      "Stores which in-app notification categories you switched on (announcements, events, polls, circulars).",
    duration: "Until you clear browser storage",
    essential: false,
  },
  {
    name: "Google Identity Services cookies",
    type: "Third-party cookie (only if you choose Sign in with Google)",
    purpose:
      "Set by Google to run the federated sign-in dialog. ThaibaHive does not read them for advertising.",
    duration: "Set by Google; see Google's own policy",
    essential: false,
  },
];

export default function CookiePolicyPage() {
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
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-500">
            <Cookie className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Cookie &amp; Browser Storage Notice</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Cookie Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: <span className="font-semibold text-foreground">{lastUpdated}</span>
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed pt-1">
            This policy explains which cookies and browser storage ThaibaHive uses, why they are
            needed, and how to control them. It should be read together with our{" "}
            <Link href="/privacy" className="font-medium text-primary underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground/90">
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              1. Strictly Necessary Storage
            </h2>
            <p className="text-muted-foreground">
              ThaibaHive does <strong>not</strong> run advertising, analytics or cross-site tracking
              cookies. The only strictly necessary cookie is the session cookie that keeps you signed
              in and lets the server enforce role-based access control. Without it, authenticated
              features cannot work at all, so it is set regardless of any preference you choose.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Settings2 className="h-5 w-5 text-primary" aria-hidden="true" />
              2. Full Storage Inventory
            </h2>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Name</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Type</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Purpose</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-muted-foreground">
                  {rows.map((row) => (
                    <tr key={row.name} className="align-top">
                      <td className="px-3 py-2.5 font-mono text-[11px] text-foreground">
                        {row.name}
                        {row.essential && (
                          <span className="ml-1.5 rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                            Essential
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">{row.type}</td>
                      <td className="px-3 py-2.5">{row.purpose}</td>
                      <td className="px-3 py-2.5">{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Ban className="h-5 w-5 text-primary" aria-hidden="true" />
              3. What We Never Set
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>No advertising, remarketing or data-brokerage cookies.</li>
              <li>No third-party behavioural profiling or cross-app tracking identifiers.</li>
              <li>No cookies set before you authenticate — the sign-in and legal pages run without any non-essential storage.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              4. Managing Your Preferences
            </h2>
            <p className="text-muted-foreground">
              You can block or delete cookies in your browser settings at any time. Blocking the
              session cookie will sign you out and prevent authentication. Clearing{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">theme</code> or{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                notification_preferences
              </code>{" "}
              only resets cosmetic and notification choices — no account data is lost.
            </p>
            <p className="text-muted-foreground">
              You can also delete your account and all associated personal data from{" "}
              <Link
                href="/my-work/settings"
                className="font-medium text-primary underline underline-offset-4"
              >
                Settings → Privacy &amp; Account Deletion
              </Link>{" "}
              — see{" "}
              <Link
                href="/account-deletion"
                className="font-medium text-primary underline underline-offset-4"
              >
                Account Deletion
              </Link>{" "}
              for details.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">5. Contact</h2>
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
