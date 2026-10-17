"use client";

import { useEffect, useState } from "react";
import {
  Users, Layers, GraduationCap as ExamIcon, CalendarDays, CalendarCheck, Award,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QuickActionCard } from "@/components/ui/quick-action-card";
import { SkeletonCard } from "@/components/ui/skeleton";

const quickActions = [
  { icon: Users, label: "Students", color: "bg-blue-500", route: "/school/students", permission: "academic.student.directory" },
  { icon: Layers, label: "Classes", color: "bg-indigo-500", route: "/school/classes", permission: "academic.classes.manage" },
  { icon: ExamIcon, label: "Examinations", color: "bg-purple-500", route: "/school/examinations", permission: "exam:read" },
  { icon: CalendarDays, label: "Academic Years", color: "bg-emerald-500", route: "/school/academic-years", permission: "academic_years:manage" },
  { icon: CalendarCheck, label: "Timetable", color: "bg-teal-500", route: "/school/timetable", permission: "timetables:read" },
  { icon: Award, label: "Grades", color: "bg-amber-500", route: "/school/grades", permission: "exam.marks.enter" },
];

export default function SchoolDashboard() {
  const [stats, setStats] = useState({ totalStudents: 0, totalClasses: 0, activeYears: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [studentsRes, classesRes, yearsRes] = await Promise.all([
          fetch("/api/academic/students?limit=1"),
          fetch("/api/academic/classes"),
          fetch("/api/academic/academic-years"),
        ]);
        if (!studentsRes.ok || !classesRes.ok || !yearsRes.ok) {
          throw new Error("Dashboard fetch returned a non-ok response");
        }
        const [studentsData, classesData, yearsData] = await Promise.all([
          studentsRes.json(),
          classesRes.json(),
          yearsRes.json(),
        ]);
        if (cancelled) return;
        setStats({
          totalStudents: (studentsData as { total?: number }).total ?? 0,
          totalClasses: ((classesData as { classes?: unknown[] }).classes ?? []).length,
          activeYears: ((yearsData as { academicYears?: unknown[] }).academicYears ?? []).length,
        });
      } catch {
        if (!cancelled) toast.error("Failed to load dashboard statistics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = [
    { title: "Total Students", value: stats.totalStudents, icon: Users, color: "bg-blue-100", iconColor: "text-blue-500" },
    { title: "Active Classes", value: stats.totalClasses, icon: Layers, color: "bg-indigo-100", iconColor: "text-indigo-500" },
    { title: "Active Academic Years", value: stats.activeYears, icon: CalendarDays, color: "bg-emerald-100", iconColor: "text-emerald-500" },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Academic Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage students, classes, exams & grades</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((card) => (
              <StatCard
                key={card.title}
                title={card.title}
                value={String(card.value)}
                icon={card.icon}
                color={card.color}
                iconColor={card.iconColor}
              />
            ))}
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <QuickActionCard
              key={action.label}
              icon={action.icon}
              label={action.label}
              color={action.color}
              onClick={() => {}}
              href={action.route}
            />
          ))}
        </div>
      </section>

      <section className="mt-8 grid lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Examinations</h3>
          <div className="space-y-3">
            <ExamRow name="Mid-term Exams - Term 2" date="Oct 15-25, 2026" status="Published" />
            <ExamRow name="Final Exams - Grade 10" date="Dec 1-10, 2026" status="Draft" />
            <ExamRow name="Practical Exams - Science" date="Nov 5-8, 2026" status="Scheduled" />
          </div>
          <Link href="/school/examinations" className="btn btn-outline btn-sm mt-4 w-full text-center">View All Exams</Link>
        </div>

        <div className="bg-card border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <ActivityItem action="Grade submitted" target="Mathematics - Grade 10A" time="10 min ago" user="Dr. Sharma" />
            <ActivityItem action="Hall ticket generated" target="Grade 12 - Physics" time="1 hour ago" user="Exam Cell" />
            <ActivityItem action="Timetable updated" target="Grade 9 - All sections" time="3 hours ago" user="Academic Coord." />
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  iconColor,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  iconColor: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-lg", color)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}

function ExamRow({ name, date, status }: { name: string; date: string; status: string }) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case "Published": return "bg-green-100 text-green-700";
      case "Draft": return "bg-gray-100 text-gray-700";
      case "Scheduled": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-sm text-muted-foreground">{date}</p>
      </div>
      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getStatusColor(status))}>
        {status}
      </span>
    </div>
  );
}

function ActivityItem({ action, target, time, user }: { action: string; target: string; time: string; user: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-xs font-semibold text-primary">⚡</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{action}</p>
        <p className="text-xs text-muted-foreground truncate">{target}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">{time}</p>
        <p className="text-xs text-muted-foreground/70">{user}</p>
      </div>
    </div>
  );
}
