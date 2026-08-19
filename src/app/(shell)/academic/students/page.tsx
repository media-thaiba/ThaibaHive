"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

type Student = {
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

type Class = {
  id: string;
  name: string;
  section: string | null;
};

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (classFilter) params.set("classId", classFilter);
      const res = await fetch(`/api/academic/students?${params}`);
      const data = await res.json();
      setStudents(data.students ?? []);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [search, classFilter]);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch("/api/academic/classes");
      const data = await res.json();
      setClasses(data.classes ?? []);
    } catch {
      setClasses([]);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <Button onClick={() => router.push("/academic/students/new")}>Add Student</Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search by name or admission no..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}{cls.section ? ` - ${cls.section}` : ""}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : students.length === 0 ? (
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
                    <Button variant="outline" size="sm" onClick={() => router.push(`/academic/students/${s.id}`)}>View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
