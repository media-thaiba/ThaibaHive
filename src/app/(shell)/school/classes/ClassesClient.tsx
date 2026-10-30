"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export type ClassItem = {
  id: string;
  name: string;
  section: string | null;
  teacherName: string | null;
  academicYearName: string | null;
};

interface ClassesClientProps {
  classes: ClassItem[];
  initialSearch?: string;
}

export function ClassesClient({ classes, initialSearch = "" }: ClassesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  const updateFilters = (newSearch: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSearch) {
      params.set("search", newSearch);
    } else {
      params.delete("search");
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (searchParams.get("search") || "")) {
        updateFilters(search);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

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
      {isPending && <span className="text-xs text-muted-foreground animate-pulse">Filtering...</span>}

      {classes.length === 0 ? (
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
                    onClick={() => router.push(`/school/students?classId=${c.id}`)}
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
