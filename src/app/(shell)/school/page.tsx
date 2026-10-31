import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/db";
import { students, classes, academicYears, institutions } from "@thaiba/db/schema";
import { verifySession, resolveRequestInstitution } from "@thaiba/auth";
import { redirect } from "next/navigation";
import { eq, and, sql } from "drizzle-orm";
import {
  Users, Layers, GraduationCap as ExamIcon, CalendarDays, CalendarCheck, Award,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickActionCard } from "@/components/ui/quick-action-card";
import { SchoolDashboardClient } from "./SchoolDashboardClient";
import StudentsLoading from "./students/loading";

export const dynamic = "force-dynamic";

const quickActions = [
  { icon: Users, label: "Students", color: "bg-blue-500", route: "/school/students", permission: "academic.student.directory" },
  { icon: Layers, label: "Classes", color: "bg-indigo-500", route: "/school/classes", permission: "academic.classes.manage" },
  { icon: ExamIcon, label: "Examinations", color: "bg-purple-500", route: "/school/examinations", permission: "exam:read" },
  { icon: CalendarDays, label: "Academic Years", color: "bg-emerald-500", route: "/school/academic-years", permission: "academic_years:manage" },
  { icon: CalendarCheck, label: "Timetable", color: "bg-teal-500", route: "/school/timetable", permission: "timetables:read" },
  { icon: Award, label: "Grades", color: "bg-amber-500", route: "/school/grades", permission: "exam.marks.enter" },
];

interface SchoolPageProps {
  searchParams: Promise<{
    institutionId?: string;
  }>;
}

async function DashboardData({ institutionId }: { institutionId: string }) {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }

  const scopedInstId = institutionId || (await resolveRequestInstitution(session));

  const instFilter = scopedInstId && scopedInstId !== "global"
    ? eq(students.institutionId, scopedInstId)
    : undefined;

  const [studentCount, classCount, yearCount, institutionRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(students).where(instFilter).get(),
    db.select({ count: sql<number>`count(*)` }).from(classes).where(and(eq(classes.isActive, true), instFilter ? eq(classes.institutionId, scopedInstId) : undefined)).get(),
    db.select({ count: sql<number>`count(*)` }).from(academicYears).where(instFilter ? eq(academicYears.institutionId, scopedInstId) : undefined).get(),
    db.select({ id: institutions.id, name: institutions.name }).from(institutions).all(),
  ]);

  return (
    <SchoolDashboardClient
      institutions={institutionRows}
      selectedInstitutionId={scopedInstId && scopedInstId !== "global" ? scopedInstId : null}
      stats={{
        totalStudents: studentCount?.count ?? 0,
        totalClasses: classCount?.count ?? 0,
        activeYears: yearCount?.count ?? 0,
      }}
    />
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

export default async function SchoolPage({ searchParams }: SchoolPageProps) {
  const resolvedSearchParams = await searchParams;
  const institutionId = resolvedSearchParams.institutionId || "";

  return (
    <div className="space-y-6">
      <Suspense key={institutionId} fallback={<StudentsLoading />}>
        <DashboardData institutionId={institutionId} />
      </Suspense>

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
