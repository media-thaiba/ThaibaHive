"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Shield,
  KeyRound,
  Building2,
  Users,
  Loader2,
  ArrowLeft,
  Search,
  X,
} from "lucide-react";

export default function NewStaffPage() {
  const router = useRouter();
  const [institutions, setInstitutions] = useState<
    { id: string; name: string }[]
  >([]);
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  const [instSearch, setInstSearch] = useState("");
  const [deptSearch, setDeptSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    employeeId: "",
    phone: "",
    designation: "",
    role: "staff",
    password: "",
    departmentIds: [] as string[],
    institutionIds: [] as string[],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/institutions").then((r) => r.json()),
      fetch("/api/admin/departments").then((r) => r.json()),
    ])
      .then(([instData, deptData]) => {
        setInstitutions(
          Array.isArray(instData.institutions) ? instData.institutions : []
        );
        setDepartments(
          Array.isArray(deptData.departments) ? deptData.departments : []
        );
      })
      .catch(() => setError("Failed to load organizations"))
      .finally(() => setLoading(false));
  }, []);

  const filteredInstitutions = useMemo(() => {
    if (!instSearch) return institutions;
    return institutions.filter((i) =>
      i.name.toLowerCase().includes(instSearch.toLowerCase())
    );
  }, [institutions, instSearch]);

  const filteredDepartments = useMemo(() => {
    if (!deptSearch) return departments;
    return departments.filter((d) =>
      d.name.toLowerCase().includes(deptSearch.toLowerCase())
    );
  }, [departments, deptSearch]);

  function toggleInstitution(id: string) {
    setForm((prev) => ({
      ...prev,
      institutionIds: prev.institutionIds.includes(id)
        ? prev.institutionIds.filter((i) => i !== id)
        : [...prev.institutionIds, id],
    }));
  }

  function toggleDepartment(id: string) {
    setForm((prev) => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(id)
        ? prev.departmentIds.filter((d) => d !== id)
        : [...prev.departmentIds, id],
    }));
  }

  const selectedInstitutions = institutions.filter((i) =>
    form.institutionIds.includes(i.id)
  );
  const selectedDepartments = departments.filter((d) =>
    form.departmentIds.includes(d.id)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create staff");
        return;
      }

      router.push("/staff");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <PageHeader
          title="Add Staff Member"
          description="Create a new staff account with their details and organizational assignments"
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          }
        />

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {error && (
            <Alert variant="error">
              <p>{error}</p>
            </Alert>
          )}

          {/* Section 1: Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="flex items-center gap-2 text-sm font-medium">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="flex items-center gap-2 text-sm font-medium">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="staff@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Professional Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5 text-primary" />
                Professional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId" className="flex items-center gap-2 text-sm font-medium">
                    Employee ID
                  </Label>
                  <Input
                    id="employeeId"
                    value={form.employeeId}
                    onChange={(e) =>
                      setForm({ ...form, employeeId: e.target.value })
                    }
                    placeholder="EMP001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation" className="flex items-center gap-2 text-sm font-medium">
                    Designation
                  </Label>
                  <Input
                    id="designation"
                    value={form.designation}
                    onChange={(e) =>
                      setForm({ ...form, designation: e.target.value })
                    }
                    placeholder="e.g. Senior Lecturer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role" className="flex items-center gap-2 text-sm font-medium">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Role
                  </Label>
                  <Select
                    id="role"
                    value={form.role}
                    onChange={(e) =>
                      setForm({ ...form, role: e.target.value })
                    }
                  >
                    <option value="staff">Staff</option>
                    <option value="hod">Head of Department</option>
                    <option value="admin">Admin</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="Leave blank to skip"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank for no-password access (admin will set later)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Organizational Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                Organizational Assignments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Institutions */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Institutions
                  {selectedInstitutions.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedInstitutions.length}
                    </Badge>
                  )}
                </Label>

                {selectedInstitutions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedInstitutions.map((inst) => (
                      <Badge
                        key={inst.id}
                        variant="default"
                        className="gap-1 pr-1"
                      >
                        {inst.name}
                        <button
                          type="button"
                          onClick={() => toggleInstitution(inst.id)}
                          className="ml-1 rounded-full p-0.5 hover:bg-primary-foreground/20 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={instSearch}
                    onChange={(e) => setInstSearch(e.target.value)}
                    placeholder="Search institutions..."
                    className="pl-9"
                  />
                </div>

                <div className="space-y-1 max-h-40 overflow-y-auto rounded-md border p-2">
                  {loading ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Loading institutions...
                    </p>
                  ) : filteredInstitutions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No institutions found
                    </p>
                  ) : (
                    filteredInstitutions.map((inst) => (
                      <label
                        key={inst.id}
                        className="flex items-center gap-2 text-sm rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={form.institutionIds.includes(inst.id)}
                          onChange={() => toggleInstitution(inst.id)}
                          className="rounded border-input"
                        />
                        {inst.name}
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Departments */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Departments
                  {selectedDepartments.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedDepartments.length}
                    </Badge>
                  )}
                </Label>

                {selectedDepartments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedDepartments.map((dept) => (
                      <Badge
                        key={dept.id}
                        variant="default"
                        className="gap-1 pr-1"
                      >
                        {dept.name}
                        <button
                          type="button"
                          onClick={() => toggleDepartment(dept.id)}
                          className="ml-1 rounded-full p-0.5 hover:bg-primary-foreground/20 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={deptSearch}
                    onChange={(e) => setDeptSearch(e.target.value)}
                    placeholder="Search departments..."
                    className="pl-9"
                  />
                </div>

                <div className="space-y-1 max-h-40 overflow-y-auto rounded-md border p-2">
                  {loading ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Loading departments...
                    </p>
                  ) : filteredDepartments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No departments found
                    </p>
                  ) : (
                    filteredDepartments.map((dept) => (
                      <label
                        key={dept.id}
                        className="flex items-center gap-2 text-sm rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={form.departmentIds.includes(dept.id)}
                          onChange={() => toggleDepartment(dept.id)}
                          className="rounded border-input"
                        />
                        {dept.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-8">
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Staff Member"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
