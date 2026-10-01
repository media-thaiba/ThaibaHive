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

  if (isLoading) {
    return (
      <div className="flex-1 p-6 space-y-4" role="status" aria-label="Loading staff directory">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <PageHeader
        title="Staff Directory"
        actions={
          <div className="flex items-center gap-3">
            <ExportButton type="staff" />
            <Link href="/staff/new">
              <Button aria-label="Add new staff member">Add Staff</Button>
            </Link>
          </div>
        }
      />

      <div className="flex gap-3">
        <label htmlFor="staff-search" className="sr-only">
          Search staff directory
        </label>
        <Input
          id="staff-search"
          aria-label="Search staff by name, email, employee ID, or designation"
          placeholder="Search by name, email, ID, or designation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle aria-live="polite">
            {filtered.length} Staff Member{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" aria-hidden="true" />}
              title="No staff found"
              description="Try adjusting your search or add a new staff member."
              action={{ label: "Add Staff", href: "/staff/new" }}
            />
          ) : (
            <ul role="list" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">
              {filtered.map((s: StaffMember) => (
                <li key={s.id}>
                  <Link
                    href={`/staff/${s.id}`}
                    aria-label={`View staff profile for ${s.firstName} ${s.lastName}, ${s.designation || s.role}, ${s.isActive ? "Active" : "Inactive"}`}
                    className="block rounded-lg border p-4 space-y-2 hover:bg-muted/30 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-muted-foreground">{s.designation || s.role}</p>
                      </div>
                      <Badge variant={s.isActive ? "success" : "secondary"} className="text-[10px]">
                        {s.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>{s.email}</p>
                      <p>ID: {s.employeeId}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
