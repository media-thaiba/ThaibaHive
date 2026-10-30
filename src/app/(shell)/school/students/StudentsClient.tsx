"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { StudentBulkImportDialog } from "@/components/academic/StudentBulkImportDialog";
import { Upload } from "lucide-react";

export type Student = {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  isActive: boolean;
  classId: string | null;
  className: string | null;
  classSection: string | null;
};

export type Class = {
  id: string;
  name: string;
  section: string | null;
  institutionId?: string | null;
};

interface StudentsClientProps {
  students: Student[];
  classes: Class[];
  institutionId: string;
  initialSearch?: string;
  initialClassFilter?: string;
}

export function StudentsClient({
  students,
  classes,
  institutionId,
  initialSearch = "",
  initialClassFilter = "",
}: StudentsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [classFilter, setClassFilter] = useState(initialClassFilter);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Sync state if URL searchParams change externally (e.g. back/forward navigation)
  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setClassFilter(searchParams.get("classId") || "");
  }, [searchParams]);

  const updateFilters = (newSearch: string, newClassId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSearch) {
      params.set("search", newSearch);
    } else {
      params.delete("search");
    }
    if (newClassId) {
      params.set("classId", newClassId);
    } else {
      params.delete("classId");
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
  };

  // Debounced search query update to avoid excessive transitions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (searchParams.get("search") || "")) {
        updateFilters(search, classFilter);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleClassChange = (val: string) => {
    setClassFilter(val);
    updateFilters(search, val);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsBulkImportOpen(true)} className="gap-1.5">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={() => router.push("/school/students/new")}>Add Student</Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search by name or admission no..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-sm"
        />
        <Select value={classFilter} onChange={(e) => handleClassChange(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}{cls.section ? ` - ${cls.section}` : ""}
            </option>
          ))}
        </Select>
        {isPending && <span className="text-xs text-muted-foreground animate-pulse">Filtering...</span>}
      </div>

      {students.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No students found</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Admission No</th>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Class</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">{s.admissionNo}</td>
                  <td className="p-3">{s.firstName} {s.lastName}</td>
                  <td className="p-3">{s.className ?? "-"}</td>
                  <td className="p-3">
                    <Badge variant={s.isActive ? "success" : "secondary"}>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/school/students/${s.id}`)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StudentBulkImportDialog
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        institutionId={institutionId}
        classes={classes}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
