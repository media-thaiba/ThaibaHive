"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type StaffForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeId: string;
  designation: string;
  role: string;
  dateOfBirth: string;
  dateOfJoining: string;
  qualifications: string;
  certificates: string;
  experienceYears: string;
  skills: string;
  languages: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  aadhaar: string;
  pan: string;
  bankAccount: string;
  ifscCode: string;
  contractEndDate: string;
  teachingSubjects: string;
  biography: string;
  nfcTagId: string;
};

const PROFILE_FIELDS: { key: keyof StaffForm; label: string; group: string }[] = [
  { key: "phone", label: "Phone", group: "Personal" },
  { key: "dateOfBirth", label: "Date of Birth", group: "Personal" },
  { key: "designation", label: "Designation", group: "Professional" },
  { key: "qualifications", label: "Qualifications", group: "Professional" },
  { key: "certificates", label: "Certificates", group: "Professional" },
  { key: "experienceYears", label: "Experience", group: "Professional" },
  { key: "skills", label: "Skills", group: "Professional" },
  { key: "languages", label: "Languages", group: "Professional" },
  { key: "emergencyContactName", label: "Emergency Contact", group: "Emergency" },
  { key: "emergencyContactPhone", label: "Emergency Phone", group: "Emergency" },
  { key: "aadhaar", label: "Aadhaar", group: "Documents" },
  { key: "pan", label: "PAN", group: "Documents" },
  { key: "bankAccount", label: "Bank Account", group: "Documents" },
  { key: "ifscCode", label: "IFSC Code", group: "Documents" },
  { key: "nfcTagId", label: "NFC Card ID", group: "Documents" },
];

const GROUP_COLORS: Record<string, string> = {
  Personal: "bg-primary",
  Professional: "bg-amber-500",
  Emergency: "bg-emerald-500",
  Documents: "bg-blue-500",
};

export default function EditStaffPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StaffForm>({
    firstName: "", lastName: "", email: "", phone: "", employeeId: "",
    designation: "", role: "staff", dateOfBirth: "", dateOfJoining: "",
    qualifications: "", certificates: "", experienceYears: "",
    skills: "", languages: "",
    emergencyContactName: "", emergencyContactPhone: "",
    aadhaar: "", pan: "", bankAccount: "", ifscCode: "",
    contractEndDate: "", teachingSubjects: "", biography: "",
    nfcTagId: "",
  });

  useEffect(() => {
    fetch(`/api/staff/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const s = data.staff;
        setForm({
          firstName: s.firstName || "",
          lastName: s.lastName || "",
          email: s.email || "",
          phone: s.phone || "",
          employeeId: s.employeeId || "",
          designation: s.designation || "",
          role: s.role || "staff",
          dateOfBirth: s.dateOfBirth || "",
          dateOfJoining: s.dateOfJoining || "",
          qualifications: s.qualifications || "",
          certificates: s.certificates || "",
          experienceYears: s.experienceYears?.toString() || "",
          skills: s.skills || "",
          languages: s.languages || "",
          emergencyContactName: s.emergencyContactName || "",
          emergencyContactPhone: s.emergencyContactPhone || "",
          aadhaar: s.aadhaar || "",
          pan: s.pan || "",
          bankAccount: s.bankAccount || "",
          ifscCode: s.ifscCode || "",
          contractEndDate: s.contractEndDate || "",
          teachingSubjects: s.teachingSubjects || "",
          biography: s.biography || "",
          nfcTagId: s.nfcTagId || "",
        });
        setLoading(false);
      });
  }, [id]);

  function setField<K extends keyof StaffForm>(key: K, value: StaffForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const filledCount = PROFILE_FIELDS.filter((f) => form[f.key]?.trim()).length;
  const totalCount = PROFILE_FIELDS.length;
  const progress = filledCount / totalCount;

  const groupedFields = PROFILE_FIELDS.reduce((acc, f) => {
    if (!acc[f.group]) acc[f.group] = [];
    acc[f.group].push(f);
    return acc;
  }, {} as Record<string, typeof PROFILE_FIELDS>);

  function getGroupFilled(group: string) {
    const fields = groupedFields[group] || [];
    return fields.filter((f) => form[f.key]?.trim()).length;
  }

  function getGroupTotal(group: string) {
    return (groupedFields[group] || []).length;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(form)) {
      if (key === "experienceYears") {
        body[key] = value ? parseFloat(value) : null;
      } else {
        body[key] = value || null;
      }
    }

    const res = await fetch(`/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to update profile");
      return;
    }

    toast.success("Profile updated successfully");
    router.push(`/staff/${id}`);
  }

  if (loading) return <div className="p-6"><Skeleton className="h-6 w-48" /></div>;

  return (
    <div className="flex-1 p-6 max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>&larr; Back</Button>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
      </div>

      <Card className="mb-6 border-primary/20 bg-primary/[0.03]">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Profile Completion</p>
              <p className="text-xs text-muted-foreground mt-0.5">{filledCount} of {totalCount} fields filled</p>
              <div className="mt-2.5 h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="flex gap-3 mt-3">
                {Object.entries(groupedFields).map(([group, _fields]) => {
                  const gf = getGroupFilled(group);
                  const gt = getGroupTotal(group);
                  return (
                    <div key={group} className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${gf === gt ? "bg-green-500" : gf > 0 ? GROUP_COLORS[group] : "bg-muted"}`} />
                      <span className="text-xs text-muted-foreground">{group} {gf}/{gt}</span>
                    </div>
                  );
                })}
              </div>
              {progress < 1 && <p className="text-xs text-muted-foreground mt-2">Fill in your details to complete your profile — {Math.round((1 - progress) * totalCount)} remaining</p>}
              {progress >= 1 && <p className="text-xs text-emerald-600 font-medium mt-2">Complete &mdash; your profile is fully filled!</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="First Name" value={form.firstName} onChange={(v) => setField("firstName", v)} required />
            <Field label="Last Name" value={form.lastName} onChange={(v) => setField("lastName", v)} required />
            <Field label="Email" type="email" value={form.email} onChange={(v) => setField("email", v)} required />
            <Field label="Phone" value={form.phone} onChange={(v) => setField("phone", v)} />
            <Field label="Employee ID" value={form.employeeId} onChange={(v) => setField("employeeId", v)} required />
            <Field label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(v) => setField("dateOfBirth", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Professional Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Designation" value={form.designation} onChange={(v) => setField("designation", v)} />
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={form.role} onChange={(e) => setField("role", e.target.value)}>
                  <option value="staff">Staff</option>
                  <option value="hod">HOD</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
              <Field label="Experience (Years)" type="number" value={form.experienceYears} onChange={(v) => setField("experienceYears", v)} />
              <Field label="Date of Joining" type="date" value={form.dateOfJoining} onChange={(v) => setField("dateOfJoining", v)} />
              <Field label="Contract End Date" type="date" value={form.contractEndDate} onChange={(v) => setField("contractEndDate", v)} />
            </div>
            <TextArea label="Qualifications (comma-separated)" value={form.qualifications} onChange={(v) => setField("qualifications", v)} />
            <TextArea label="Certificates (comma-separated)" value={form.certificates} onChange={(v) => setField("certificates", v)} />
            <TextArea label="Skills (comma-separated)" value={form.skills} onChange={(v) => setField("skills", v)} />
            <TextArea label="Languages (comma-separated)" value={form.languages} onChange={(v) => setField("languages", v)} />
            <TextArea label="Teaching Subjects (comma-separated)" value={form.teachingSubjects} onChange={(v) => setField("teachingSubjects", v)} />
            <TextArea label="Biography" value={form.biography} onChange={(v) => setField("biography", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Emergency Contact</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Contact Name" value={form.emergencyContactName} onChange={(v) => setField("emergencyContactName", v)} />
            <Field label="Contact Phone" value={form.emergencyContactPhone} onChange={(v) => setField("emergencyContactPhone", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Document / HR Info</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Aadhaar" value={form.aadhaar} onChange={(v) => setField("aadhaar", v)} />
            <Field label="PAN" value={form.pan} onChange={(v) => setField("pan", v)} />
            <Field label="Bank Account" value={form.bankAccount} onChange={(v) => setField("bankAccount", v)} />
            <Field label="IFSC Code" value={form.ifscCode} onChange={(v) => setField("ifscCode", v)} />
            <Field label="NFC Card ID" value={form.nfcTagId} onChange={(v) => setField("nfcTagId", v)} placeholder="e.g. AABBCCDD" />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}

function TextArea({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[60px]"
      />
    </div>
  );
}
