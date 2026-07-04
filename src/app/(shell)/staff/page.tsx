"use client";

import { useState } from "react";
import Link from "next/link";

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  designation: string | null;
  role: string;
  phone: string | null;
  isActive: boolean;
};

export default function StaffDirectoryPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function fetchData() {
    const res = await fetch("/api/staff");
    const data = await res.json();
    setStaffList(data.staff);
    setLoading(false);
  }

  useState(() => { fetchData(); });

  const filtered = staffList.filter(
    (s) =>
      s.firstName.toLowerCase().includes(search.toLowerCase()) ||
      s.lastName.toLowerCase().includes(search.toLowerCase()) ||
      s.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff Directory</h1>
        <Link
          href="/staff/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Add Staff
        </Link>
      </div>

      <input
        type="text"
        placeholder="Search by name, employee ID, or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Employee ID</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Designation</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link href={`/staff/${s.id}`} className="font-medium hover:underline">
                    {s.firstName} {s.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.employeeId}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.designation || "—"}</td>
                <td className="px-4 py-3 capitalize">{s.role}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
