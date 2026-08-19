"use client";

/**
 * Staff Directory Page
 * Migrated to TanStack Query (P2-46) and Central API Client (P2-47).
 */

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportButton } from "@/components/export-button";
import { useDebounce } from "@/hooks/use-debounce";
import { Users } from "lucide-react";
import { useStaffList, type StaffMember } from "@/lib/hooks/use-staff";

export default function StaffDirectoryPage() {
  const { data: staffList = [], isLoading } = useStaffList();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 150);

  const filtered = staffList.filter(
    (s: StaffMember) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      s.employeeId.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (s.designation || "").toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  if (isLoading) return <div className="flex-1 p-6"><Skeleton className="h-8 w-48" /></div>;

  return (
    <div className="flex-1 space-y-6 p-6">
      <PageHeader
        title="Staff Directory"
        actions={
          <div className="flex items-center gap-3">
            <ExportButton type="staff" />
            <Link href="/staff/new">
              <Button>Add Staff</Button>
            </Link>
          </div>
        }
      />

      <div className="flex gap-3">
        <Input placeholder="Search by name, email, ID, or designation..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
      </div>

      <Card>
        <CardHeader><CardTitle>{filtered.length} Staff Member{filtered.length !== 1 ? "s" : ""}</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="No staff found"
              description="Try adjusting your search or add a new staff member."
              action={{ label: "Add Staff", href: "/staff/new" }}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((s: StaffMember) => (
                <Link key={s.id} href={`/staff/${s.id}`} className="rounded-lg border p-4 space-y-2 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-muted-foreground">{s.designation || s.role}</p>
                    </div>
                    <Badge variant={s.isActive ? "success" : "secondary"} className="text-[10px]">{s.isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>{s.email}</p>
                    <p>ID: {s.employeeId}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
