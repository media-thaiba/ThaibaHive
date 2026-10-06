"use client";

import { Users, Layers, GraduationCap as ExamIcon, CalendarDays, CalendarCheck, Award } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { QuickActionCard } from "@/components/ui/quick-action-card";

const quickActions = [
  { icon: Users, label: "Students", color: "bg-blue-500", route: "/school/students", permission: "academic.student.directory" },
  { icon: Layers, label: "Classes", color: "bg-indigo-500", route: "/school/classes", permission: "academic.classes.manage" },
  { icon: ExamIcon, label: "Examinations", color: "bg-purple-500", route: "/school/examinations", permission: "exam:read" },
  { icon: CalendarDays, label: "Academic Years", color: "bg-emerald-500", route: "/school/academic-years", permission: "academic_years:manage" },
  { icon: CalendarCheck, label: "Timetable", color: "bg-teal-500", route: "/school/timetable", permission: "timetables:read" },
  { icon: Award, label: "Grades", color: "bg-amber-500", route: "/school/grades", permission: "exam.marks.enter" },
];

export default function SchoolDashboard() {
  const filteredActions = quickActions.filter((action) => {
    if (!action.permission) return true;
    return true;
  });

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Academic Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage students, classes, exams & grades</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value="1,234" subtitle="+12 this month" icon="Users" color="text-blue-500" />
        <StatCard title="Active Classes" value="48" subtitle="6 new this term" icon="Layers" color="text-indigo-500" />
        <StatCard title="Active Exams" value="3" subtitle="Grading in progress" icon="Award" color="text-purple-500" />
        <StatCard title="Attendance Rate" value="94.2%" subtitle="Above target" icon="ClipboardCheck" color="text-green-500" />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredActions.map((action) => (
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
  subtitle,
  icon: IconName,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
}) {
  const iconElement = (() => {
    switch (IconName) {
      case "Users": return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1h10v-1a6 6 0 00-6-6H3z" /></svg>;
      case "Layers": return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5v14M4 8v11M4 11v8M12 5v14m0-11v11m0-8v8m9-15v14M20 5v14m0-11v11m0-8v8" /></svg>;
      case "Award": return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
      case "ClipboardCheck": return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
      default: return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
    }
  })();

  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-lg", color.replace("text-", "bg-").replace("500", "100"))}>
          {iconElement}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground/70">{subtitle}</p>
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