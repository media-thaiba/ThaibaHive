"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

type ClassItem = {
  id: string;
  name: string;
  section: string | null;
  teacherName: string | null;
  academicYearName: string | null;
};

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/academic/classes?${params}`);
      const data = await res.json();
      setClasses(data.classes ?? []);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Classes</h1>
        <Button>Add Class</Button>
      </div>

      <Input
        placeholder="Search classes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No classes found</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{c.name}</h3>
                  {c.section && (
                    <span className="text-sm text-muted-foreground">Sec: {c.section}</span>
                  )}
                </div>
                {c.teacherName && (
                  <p className="text-sm text-muted-foreground">Teacher: {c.teacherName}</p>
                )}
                {c.academicYearName && (
                  <p className="text-sm text-muted-foreground">Year: {c.academicYearName}</p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <button
                    onClick={() => router.push(`/academic/students?classId=${c.id}`)}
                    className="text-sm text-primary hover:underline"
                  >
                    View Roster
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
