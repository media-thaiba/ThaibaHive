"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
};

export default function StaffProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useState(() => {
    fetch(`/api/staff/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setStaff(data.staff);
        setLoading(false);
      });
  });

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  if (!staff) return <div className="p-6 text-sm text-destructive">Staff not found</div>;

  return (
    <div className="flex-1 p-6 max-w-lg">
      <button onClick={() => router.back()} className="mb-4 text-sm text-muted-foreground hover:underline">
        &larr; Back
      </button>

      <div className="rounded-lg border p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{staff.firstName} {staff.lastName}</h1>
          <p className="text-sm text-muted-foreground">{staff.designation || staff.role}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Employee ID</span>
            <p className="font-medium">{staff.employeeId}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Role</span>
            <p className="font-medium capitalize">{staff.role}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Email</span>
            <p className="font-medium">{staff.email}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Phone</span>
            <p className="font-medium">{staff.phone || "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <p className={`font-medium ${staff.isActive ? "text-green-600" : "text-red-600"}`}>
              {staff.isActive ? "Active" : "Inactive"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
