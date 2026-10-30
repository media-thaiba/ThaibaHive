import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ScrollText, Baby, Gavel, Languages } from "lucide-react";

export const metadata: Metadata = {
  title: "DPDP Act 2023 Data Notice — ThaibaHive",
  description:
    "Digital Personal Data Protection Act, 2023 Section 5 notice: what personal data we collect, why, on what lawful basis, and your rights as a Data Principal.",
};

const collected = [
  {
    data: "Name, institutional email address, employee or admission number, department and role",
    purpose: "Account creation, identity verification and role-based access control",
    basis: "Contract with the institution and legitimate administrative use",
  },
  {
    data: "Attendance records, leave requests, timetable participation, examination marks",
    purpose: "Academic administration and statutory attendance reporting",
    basis: "Contract and legal obligation",
  },
  {
    data: "Government identifiers (Aadhaar, PAN) and bank account / IFSC details",
    purpose: "Payroll, statutory tax deduction and statutory filings only",
    basis: "Legal obligation under Indian tax and labour law",
  },
  {
    data: "Facial recognition vectors and fingerprint hashes (voluntary enrolment only)",
    purpose: "Biometric attendance punch and physical access control",
    basis: "Explicit consent, which may be withdrawn at any time",
  },
  {
    data: "Campus CCTV frames, licence-plate captures and geofence punch coordinates",
    purpose: "Campus physical security and geofenced attendance verification",
    basis: "Legitimate institutional security interest, with rolling purge in 7–30 days",
  },
  {
    data: "Device logs: IP address, user agent, cryptographic session identifiers",
    purpose: "Security monitoring, abuse prevention and tamper-evident audit logging",
    basis: "Legitimate interest in protecting the platform",
  },
];

export default function DpdpNoticePage() {
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
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-500">
            <ScrollText className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Digital Personal Data Protection Act, 2023 — Section 5 Notice</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Personal Data Collection Notice
          </h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: <span className="font-semibold text-foreground">{lastUpdated}</span>
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed pt-1">
            This notice is given to every Data Principal — staff, students, guardians and visitors —
            before we collect or process their personal data. It is available in English and Tamil.
          </p>
        </div>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground/90">
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <ScrollText className="h-5 w-5 text-primary" aria-hidden="true" />
              1. English Notice
            </h2>
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">Data Fiduciary:</strong> Thaiba Garden Educational
                Institutions, operating the ThaibaHive Campus Operating System.
              </p>
              <p>
                <strong className="text-foreground">What we collect and why:</strong> the table below
                lists every category of personal data, its purpose, and the lawful basis on which it
                is processed. We collect only what those purposes require.
              </p>
              <p>
                <strong className="text-foreground">Withdrawal of consent:</strong> where processing
                rests on consent (for example biometric facial punch), you may withdraw it at any
                time from Settings, and processing stops without affecting the lawfulness of earlier
                processing.
              </p>
              <p>
                <strong className="text-foreground">Your rights:</strong> access, correction, erasure
                and the right to grievance redressal under Sections 11, 12 and 13 of the Act.
              </p>
              <p>
                <strong className="text-foreground">No tracking or behavioural monitoring of
                children:</strong> see section 3 below.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              2. Data, Purpose and Lawful Basis
            </h2>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Personal Data</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Purpose</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Lawful Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-muted-foreground">
                  {collected.map((row) => (
                    <tr key={row.data} className="align-top">
                      <td className="px-3 py-2.5 text-foreground">{row.data}</td>
                      <td className="px-3 py-2.5">{row.purpose}</td>
                      <td className="px-3 py-2.5">{row.basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Baby className="h-5 w-5 text-primary" aria-hidden="true" />
              3. Children&apos;s Personal Data (Section 9)
            </h2>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3 text-muted-foreground">
              <p>
                We do <strong className="text-foreground">not</strong> process the personal data of a
                child unless we have verifiable parental or lawful-guardian consent, and we never
                track a child, conduct behavioural monitoring on a child, or target advertising at a
                child.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Student facial-recognition enrolment is <strong>off by default</strong> and stays
                  off until a parent or guardian linked to the student in{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                    student_guardians
                  </code>{" "}
                  gives explicit, recorded consent.
                </li>
                <li>
                  Surveillance consent for minors defaults to <strong>refused</strong>, not granted.
                </li>
                <li>
                  Consent can be withdrawn by the parent or guardian at any time, after which
                  biometric templates are purged.
                </li>
              </ul>
              <p>
                Guardian consent questions:{" "}
                <a
                  href="mailto:grievance@thaibahive.com"
                  className="font-medium text-primary underline"
                >
                  grievance@thaibahive.com
                </a>
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Languages className="h-5 w-5 text-primary" aria-hidden="true" />
              4. தமிழ் அறிவிப்பு (Tamil Notice)
            </h2>
            <div
              lang="ta"
              className="rounded-xl border border-border/60 bg-card p-5 space-y-3 text-muted-foreground"
            >
              <p className="font-semibold text-foreground">
                தனிநபர் தரவு சேகரிப்பு குறித்த அறிவிப்பு — DPDP சட்டம், 2023 (பிரிவு 5)
              </p>
              <p>
                தங்களின் தனிப்பட்ட தரவு, தமிழ்ப் பள்ளி வளாக கல்வி மற்றும் நிர்வாகச் சேவைகளை
                வழங்குவதற்காக மட்டுமே சேகரிக்கப்படுகிறது. பெயர், மின்னஞ்சல், பணியாளர் அடையாளம்,
                வருகைப் பதிவு, மாணவர் பதிவுகள் மற்றும் ஊதியம் தொடர்பான சட்டத் தரவு ஆகியவை
                சேகரிக்கப்படுகின்றன.
              </p>
              <p>
                சட்டப்பூர்வ அடிப்படை: ஒப்பந்தம், சட்டக் கடமை மற்றும் தெளிவான சம்மதம். உங்கள்
                உரிமைகள் — அணுகல், திருத்தம், நீக்கம் மற்றும் முறையீடு (பிரிவுகள் 11, 12, 13).
              </p>
              <p>
                குழந்தைகளின் தரவு: பெற்றோர் அல்லது சட்டப்பூர்வ பாதுகாவலரின் சரிபார்க்கப்பட்ட
                சம்மதம் இல்லாமல் குழந்தைகளின் தரவு செயலாக்கப்படுவதில்லை; குழந்தைகளை கண்காணித்தல்
                அல்லது நடத்தைக் கணிப்பு மேற்கொள்ளப்படுவதில்லை.
              </p>
              <p>
                முறையீட்டு அலுவலர்:{" "}
                <a
                  href="mailto:grievance@thaibahive.com"
                  className="font-medium text-primary underline"
                >
                  grievance@thaibahive.com
                </a>
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <Gavel className="h-5 w-5 text-primary" aria-hidden="true" />
              5. Grievance Redressal (Section 13)
            </h2>
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
              <p>Acknowledgement: within 72 hours. Resolution: within the period prescribed by the Act.</p>
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
            <Link href="/account-deletion" className="hover:text-foreground">
              Account Deletion
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
