"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Download,
  Send,
  Building2,
  BookOpen,
  Award,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
} from "lucide-react";

interface CircularItem {
  id: string;
  title: string;
  category?: string | null;
  createdAt: string;
  fileUrl?: string | null;
}

export default function PublicInstitutionPortalPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  const code = resolvedParams.code.toLowerCase();

  // Institution metadata profile
  const institutionName =
    code === "tgcis"
      ? "Thaiba Garden College of Integrated Studies (TGCIS)"
      : `${code.toUpperCase()} — Thaiba Garden Institution`;

  const [circulars, setCirculars] = useState<CircularItem[]>([]);
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [isAffiliationOpen, setIsAffiliationOpen] = useState(false);

  // Admission Enquiry Form State
  const [applicantName, setApplicantName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [appliedCourse, setAppliedCourse] = useState("");
  const [notes, setNotes] = useState("");
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState<string | null>(null);
  const [enquiryError, setEnquiryError] = useState<string | null>(null);

  // Affiliation Form State
  const [campusName, setCampusName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [affEmail, setAffEmail] = useState("");
  const [affPhone, setAffPhone] = useState("");
  const [affAddress, setAffAddress] = useState("");
  const [affCapacity, setAffCapacity] = useState("");
  const [affLoading, setAffLoading] = useState(false);
  const [affSuccess, setAffSuccess] = useState<string | null>(null);
  const [affError, setAffError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch public circulars
    fetch("/api/circulars")
      .then((r) => r.json())
      .then((data) => {
        setCirculars((data.circulars || []).slice(0, 6));
      })
      .catch(() => {});
  }, []);

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnquiryLoading(true);
    setEnquiryError(null);

    try {
      const res = await fetch("/api/public/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: "inst_tgcis",
          applicantName,
          guardianName,
          email,
          phone,
          appliedGradeOrCourse: appliedCourse,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit enquiry");
      }

      setEnquirySuccess(data.message || "Enquiry submitted successfully.");
      setTimeout(() => {
        setIsEnquiryOpen(false);
        setEnquirySuccess(null);
        setApplicantName("");
        setGuardianName("");
        setEmail("");
        setPhone("");
        setAppliedCourse("");
        setNotes("");
      }, 2500);
    } catch (err: unknown) {
      setEnquiryError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setEnquiryLoading(false);
    }
  };

  const handleAffiliationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAffLoading(true);
    setAffError(null);

    try {
      const res = await fetch("/api/public/affiliations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campusName,
          contactPerson,
          email: affEmail,
          phone: affPhone,
          locationAddress: affAddress,
          totalCapacity: Number(affCapacity) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit affiliation proposal");
      }

      setAffSuccess(data.message || "Application submitted successfully.");
      setTimeout(() => {
        setIsAffiliationOpen(false);
        setAffSuccess(null);
        setCampusName("");
        setContactPerson("");
        setAffEmail("");
        setAffPhone("");
        setAffAddress("");
        setAffCapacity("");
      }, 2500);
    } catch (err: unknown) {
      setAffError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setAffLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <span className="font-bold text-base leading-tight block">{institutionName}</span>
              <span className="text-xs text-muted-foreground">Thaiba Garden Group of Institutions</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAffiliationOpen(true)}
              className="hidden sm:inline-flex text-xs"
            >
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              Campus Affiliation
            </Button>

            <Link href="/auth/login">
              <Button size="sm" className="gap-1.5 text-xs">
                <Lock className="h-3.5 w-3.5" />
                Staff Portal Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 border-b bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          <Badge variant="secondary" className="px-3 py-1 text-xs gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Admissions Open for Academic Year 2026–2027
          </Badge>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Excellence in Integrated Higher Education & Character Building
          </h1>

          <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Welcome to {institutionName}. We blend modern academic rigor with comprehensive values, empowering students to lead and innovate in science, arts, commerce, and holistic development.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button size="lg" onClick={() => setIsEnquiryOpen(true)} className="gap-2 shadow-lg">
              <Send className="h-4 w-4" />
              Apply for Admission / Enquiry
            </Button>
            <a href="#downloads">
              <Button size="lg" variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Download Prospectus & Circulars
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-16 max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-8">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Award className="h-5 w-5 text-primary" />
              Our Mission
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm leading-relaxed">
            To provide high-quality, inclusive, and contemporary higher education that nurtures intellectual curiosity, social responsibility, and ethical leadership across our main and affiliated campuses.
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              Our Vision
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm leading-relaxed">
            To stand as a premier integrated educational hub under the Thaiba Garden umbrella, setting benchmarks in academic excellence, digital campus governance, and community upliftment.
          </CardContent>
        </Card>
      </section>

      {/* Downloads & Circulars Section */}
      <section id="downloads" className="py-12 bg-muted/30 border-y">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Official Circulars & Downloads</h2>
              <p className="text-xs text-muted-foreground">Access institutional notices, academic calendars, and syllabi.</p>
            </div>
            <Badge variant="outline">{circulars.length} Documents</Badge>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {circulars.map((c) => (
              <Card key={c.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
                      {c.category || "Official Notice"}
                    </span>
                    <h3 className="font-semibold text-sm line-clamp-2">{c.title}</h3>
                  </div>
                  <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground border-t">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                    <a
                      href={`/api/circulars/${c.id}/download`}
                      download
                      className="text-primary hover:underline font-medium flex items-center gap-1"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t py-8 bg-background">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {institutionName}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Powered by ThaibaHive Unified Platform</span>
            <Link href="/auth/login" className="text-primary hover:underline">
              Portal Access
            </Link>
          </div>
        </div>
      </footer>

      {/* Student Admission Enquiry Dialog */}
      <Dialog open={isEnquiryOpen} onOpenChange={setIsEnquiryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Admission Enquiry Form — {code.toUpperCase()}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEnquirySubmit} className="space-y-3 pt-2 text-sm">
            {enquiryError && <Alert variant="error">{enquiryError}</Alert>}
            {enquirySuccess && (
              <Alert variant="info" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 shrink-0 inline mr-2" />
                {enquirySuccess}
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Student / Applicant Name</label>
                <Input
                  placeholder="e.g. Bilal Ahmed"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Parent / Guardian Name</label>
                <Input
                  placeholder="e.g. Tariq Ahmed"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Mobile Phone Number</label>
                <Input
                  type="tel"
                  placeholder="10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Email Address (Optional)</label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Desired Grade / Degree Program</label>
              <Input
                placeholder="e.g. B.Sc Computer Science, Grade 11 Science"
                value={appliedCourse}
                onChange={(e) => setAppliedCourse(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Questions / Background Details</label>
              <Textarea
                placeholder="Share any questions regarding scholarships, hostel accommodation, or transportation."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <DialogFooter className="gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setIsEnquiryOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={enquiryLoading}>
                {enquiryLoading ? "Submitting..." : "Submit Application"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Campus Affiliation Request Dialog */}
      <Dialog open={isAffiliationOpen} onOpenChange={setIsAffiliationOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Campus Affiliation Application</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAffiliationSubmit} className="space-y-3 pt-2 text-sm">
            {affError && <Alert variant="error">{affError}</Alert>}
            {affSuccess && (
              <Alert variant="info" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 shrink-0 inline mr-2" />
                {affSuccess}
              </Alert>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold">Proposed Campus / Center Name</label>
              <Input
                placeholder="e.g. TGCIS North Campus"
                value={campusName}
                onChange={(e) => setCampusName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Contact Person / Principal</label>
                <Input
                  placeholder="Full name"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Contact Phone</label>
                <Input
                  type="tel"
                  placeholder="Phone number"
                  value={affPhone}
                  onChange={(e) => setAffPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Contact Email</label>
                <Input
                  type="email"
                  placeholder="office@campus.org"
                  value={affEmail}
                  onChange={(e) => setAffEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Proposed Student Capacity</label>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  value={affCapacity}
                  onChange={(e) => setAffCapacity(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Campus Address & Location</label>
              <Textarea
                placeholder="Street address, district, state, pin code"
                value={affAddress}
                onChange={(e) => setAffAddress(e.target.value)}
                rows={2}
                required
              />
            </div>

            <DialogFooter className="gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setIsAffiliationOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={affLoading}>
                {affLoading ? "Submitting..." : "Submit Affiliation Proposal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
