"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function NewStaffPage() {
  const router = useRouter();
  const [institutions, setInstitutions] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", employeeId: "",
    phone: "", designation: "", role: "staff", password: "",
    departmentIds: [] as string[], institutionIds: [] as string[],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/institutions").then((r) => r.json()),
      fetch("/api/admin/departments").then((r) => r.json()),
    ]).then(([instData, deptData]) => {
      setInstitutions(Array.isArray(instData.institutions) ? instData.institutions : []);
      setDepartments(Array.isArray(deptData.departments) ? deptData.departments : []);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

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
  }

  return (
    <div className="flex-1 p-6 max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Add Staff Member</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">First Name</label>
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Last Name</label>
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Employee ID</label>
            <Input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Designation</label>
            <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="staff">Staff</option>
              <option value="hod">HOD</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <p className="text-xs text-muted-foreground">Leave blank for no-password access (admin will set later)</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Institutions</label>
          <div className="space-y-1 max-h-32 overflow-y-auto rounded-md border p-2">
            {institutions.map((inst) => (
              <label key={inst.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.institutionIds.includes(inst.id)}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      institutionIds: e.target.checked
                        ? [...form.institutionIds, inst.id]
                        : form.institutionIds.filter((id) => id !== inst.id),
                    });
                  }}
                />
                {inst.name}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Departments</label>
          <div className="space-y-1 max-h-32 overflow-y-auto rounded-md border p-2">
            {departments.map((dept) => (
              <label key={dept.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.departmentIds.includes(dept.id)}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      departmentIds: e.target.checked
                        ? [...form.departmentIds, dept.id]
                        : form.departmentIds.filter((id) => id !== dept.id),
                    });
                  }}
                />
                {dept.name}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit">Create Staff</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
