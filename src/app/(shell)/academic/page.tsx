"use client";

import { useState, useEffect } from "react";
import { SkeletonCard } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Calendar } from "lucide-react";

export default function AcademicDashboardPage() {
  const [stats, setStats] = useState({ totalStudents: 0, totalClasses: 0, activeYears: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/academic/students?limit=1").then(r => r.json()).catch(() => ({ total: 0 })),
      fetch("/api/academic/classes").then(r => r.json()).catch(() => ({ classes: [] })),
      fetch("/api/academic/academic-years").then(r => r.json()).catch(() => ({ academicYears: [] })),
    ])
      .then(([studentsRes, classesRes, yearsRes]) => {
        setStats({
          totalStudents: (studentsRes as { total?: number }).total ?? 0,
          totalClasses: ((classesRes as { classes?: unknown[] }).classes ?? []).length,
          activeYears: ((yearsRes as { academicYears?: unknown[] }).academicYears ?? []).length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { title: "Total Students", value: stats.totalStudents, icon: Users, color: "text-blue-600" },
    { title: "Total Classes", value: stats.totalClasses, icon: BookOpen, color: "text-green-600" },
    { title: "Active Academic Years", value: stats.activeYears, icon: Calendar, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Academic Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : cards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{card.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
