"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

type StaffDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  phone: string | null;
  designation: string | null;
  role: string;
  isActive: boolean;
  dateOfBirth: string | null;
  dateOfJoining: string | null;
  qualifications: string | null;
  certificates: string | null;
  experienceYears: number | null;
  skills: string | null;
  languages: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  aadhaar: string | null;
  pan: string | null;
  bankAccount: string | null;
  ifscCode: string | null;
  contractEndDate: string | null;
  teachingSubjects: string | null;
  biography: string | null;
};

type TimelineEntry = {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  metadata: Record<string, unknown>;
};

function parseList(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[parseList] Failed to parse JSON:", value, e);
    }
  }
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium">{value || "\u2014"}</p>
    </div>
  );
}

export default function StaffProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/staff/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Staff fetch failed: ${r.status}`);
        return r.json();
      })
      .then((data) => setStaff(data.staff))
      .catch((e) => { if (process.env.NODE_ENV === "development") console.error(e); })
      .finally(() => setLoading(false));

    fetch(`/api/staff/${id}/timeline`)
      .then((r) => r.json())
      .then((data) => setTimeline(Array.isArray(data.timeline) ? data.timeline : []))
      .catch(() => setTimeline([]));
  }, [id]);

  if (loading) return <div className="flex-1 space-y-6 p-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-48 w-full" /></div>;
  if (!staff) return <div className="p-6 text-sm text-destructive">Staff not found</div>;

  const skillsList = parseList(staff.skills);
  const languagesList = parseList(staff.languages);
  const teachingSubjectsList = parseList(staff.teachingSubjects);
  const qualificationsList = parseList(staff.qualifications);
  const certificatesList = parseList(staff.certificates);

  const groupedTimeline = timeline.reduce<Record<string, TimelineEntry[]>>((acc, entry) => {
    const date = entry.date.slice(0, 10);
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>&larr; Back</Button>
          <h1 className="text-2xl font-bold">{staff.firstName} {staff.lastName}</h1>
          <Badge variant={staff.isActive ? "default" : "secondary"}>{staff.isActive ? "Active" : "Inactive"}</Badge>
        </div>
        <Link href={`/staff/${id}/edit`}><Button>Edit Profile</Button></Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoRow label="First Name" value={staff.firstName} />
            <InfoRow label="Last Name" value={staff.lastName} />
            <InfoRow label="Email" value={staff.email} />
            <InfoRow label="Phone" value={staff.phone} />
            <InfoRow label="Date of Birth" value={formatDate(staff.dateOfBirth)} />
            <InfoRow label="Employee ID" value={staff.employeeId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Professional Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Designation" value={staff.designation} />
              <InfoRow label="Role" value={staff.role} />
              <InfoRow label="Experience" value={staff.experienceYears ? `${staff.experienceYears} years` : null} />
            </div>
            {qualificationsList.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Qualifications</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {qualificationsList.map((q, i) => <Badge key={i} variant="outline">{q}</Badge>)}
                </div>
              </div>
            )}
            {certificatesList.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Certificates</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {certificatesList.map((c, i) => <Badge key={i} variant="outline">{c}</Badge>)}
                </div>
              </div>
            )}
            {skillsList.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Skills</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {skillsList.map((s, i) => <Badge key={i}>{s}</Badge>)}
                </div>
              </div>
            )}
            {languagesList.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Languages</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {languagesList.map((l, i) => <Badge key={i} variant="secondary">{l}</Badge>)}
                </div>
              </div>
            )}
            {teachingSubjectsList.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Teaching Subjects</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {teachingSubjectsList.map((s, i) => <Badge key={i} variant="warning">{s}</Badge>)}
                </div>
              </div>
            )}
            {staff.biography && (
              <div>
                <span className="text-xs text-muted-foreground">Biography</span>
                <p className="mt-1 text-sm">{staff.biography}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Emergency Contact</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoRow label="Contact Name" value={staff.emergencyContactName} />
            <InfoRow label="Contact Phone" value={staff.emergencyContactPhone} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Document / HR Info</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoRow label="Aadhaar" value={staff.aadhaar} />
            <InfoRow label="PAN" value={staff.pan} />
            <InfoRow label="Bank Account" value={staff.bankAccount} />
            <InfoRow label="IFSC Code" value={staff.ifscCode} />
            <InfoRow label="Date of Joining" value={formatDate(staff.dateOfJoining)} />
            <InfoRow label="Contract End Date" value={formatDate(staff.contractEndDate)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Activity Timeline</CardTitle></CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTimeline).map(([date, entries]) => (
                <div key={date}>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{formatDate(date)}</p>
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 rounded-lg border p-3">
                        <div className="mt-0.5">
                          <TypeBadge type={entry.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{entry.title}</p>
                          {entry.description && <p className="text-xs text-muted-foreground">{entry.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "outline" }> = {
    attendance: { label: "Attendance", variant: "success" },
    leave: { label: "Leave", variant: "warning" },
    task: { label: "Task", variant: "default" },
    report: { label: "Report", variant: "secondary" },
    recognition: { label: "Recognition", variant: "success" },
    expense: { label: "Expense", variant: "outline" },
  };
  const c = config[type] || { label: type, variant: "outline" as const };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
