"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CheckSquare,
  Users,
  ClipboardCheck,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import dynamic from "next/dynamic";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActiveTasksPanel } from "@/components/dashboard/active-tasks-panel";
import { AttendanceWidget } from "@/components/dashboard/attendance-widget";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { FocusLinks } from "@/components/dashboard/focus-links";
import { PermissionGate } from "@/components/ui/permission-gate";

const LeaveDialog = dynamic(
  () => import("@/components/dashboard/leave-dialog").then((m) => m.LeaveDialog),
  { ssr: false }
);
const TaskDialog = dynamic(
  () => import("@/components/dashboard/task-dialog").then((m) => m.TaskDialog),
  { ssr: false }
);

type DashboardData = {
  staffCount: number;
  todayPresent: number;
  pendingApprovals: number;
  myPendingTasks: number;
  completedTasks: number;
  totalTasks: number;
  checkedInToday: boolean;
  profileFields: { filled: number; total: number };
  leaveRemaining: number;
  leaveTotal: number;
  hasCheckedIn: boolean;
};

type TaskItem = { id: string; title: string; priority: string; dueDate?: string; status: string };

export default function DashboardPage() {
  const { staff } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTasks, setActiveTasks] = useState<TaskItem[]>([]);
  const [clockingOut, setClockingOut] = useState(false);

  // Dialog states
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!staff) return;
    try {
      const res = await fetch("/api/dashboard/stats");
      const d = await res.json();
      if (!res.ok) { setLoading(false); return; }
      setActiveTasks(d.activeTasks || []);
      setData({
        staffCount: d.staffCount ?? 0,
        todayPresent: d.todayPresent ?? 0,
        pendingApprovals: d.pendingApprovals ?? 0,
        myPendingTasks: d.myPendingTasks ?? 0,
        completedTasks: d.completedTasks ?? 0,
        totalTasks: d.totalTasks ?? 0,
        checkedInToday: d.checkedInToday ?? false,
        profileFields: d.profileFields ?? { filled: 0, total: 7 },
        leaveRemaining: d.leaveRemaining ?? 0,
        leaveTotal: d.leaveTotal ?? 0,
        hasCheckedIn: d.checkedInToday ?? false,
      });
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, [staff]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleToggleTask(taskId: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (!res.ok) { toast.error("Failed to update task"); return; }
      toast.success("Task marked as completed!");
      fetchData();
    } catch { toast.error("Failed to update task"); }
  }

  async function handleClockOut() {
    setClockingOut(true);
    try {
      const res = await fetch("/api/attendance/check-out", { method: "POST" });
      const body = await res.json();
      if (!res.ok) { toast.error(body.error || "Failed to clock out"); return; }
      toast.success("Clocked out successfully");
      fetchData();
    } catch { toast.error("Failed to clock out"); }
    finally { setClockingOut(false); }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const isAdmin = staff && ["super_admin", "admin", "principal", "hod"].includes(staff.role);

  if (loading) return (
    <div className="flex-1 space-y-8 p-6 lg:p-8">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-28" />)}
      </div>
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-64" />
        </div>
        <div className="space-y-6">
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-40" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 space-y-8 p-6 lg:p-8">

      {/* Greeting Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {staff?.firstName}
          </h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <span>{staff?.designation || staff?.role}</span>
            <span className="text-muted-foreground/30">·</span>
            {data?.checkedInToday ? (
              <span className="inline-flex items-center gap-1.5 text-success font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Checked in today
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-warning font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                Not checked in today
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Top Metrics */}
      <section>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
          <PermissionGate anyRole={["super_admin", "admin", "principal", "hod"]} fallback={null}>
            <StatCard id="tour-profile" label="Staff Present" value={data?.todayPresent ?? 0} suffix={` / ${data?.staffCount ?? 0}`} progress={data && data.staffCount > 0 ? data.todayPresent / data.staffCount : 0} href="/admin/attendance-locations" icon={<Users className="h-4 w-4" />} color="success" />
          </PermissionGate>
          <PermissionGate anyRole={["super_admin", "admin", "principal", "hod", "staff", "accounts", "purchase"]} fallback={null}>
            <StatCard id="tour-profile" label="Profile Completion" value={data?.profileFields.filled ?? 0} suffix={` / ${data?.profileFields.total ?? 7}`} progress={data ? data.profileFields.filled / data.profileFields.total : 0} href={staff ? `/admin/staff/${staff.id}/edit` : "/admin/staff"} icon={<ShieldCheck className="h-4 w-4" />} color="primary" />
          </PermissionGate>
          <StatCard label="Tasks Done" value={data?.completedTasks ?? 0} suffix={` / ${data?.totalTasks ?? 0}`} progress={data && data.totalTasks > 0 ? data.completedTasks / data.totalTasks : 0} href="/my-work/tasks" icon={<ClipboardCheck className="h-4 w-4" />} color="info" />
          <StatCard label="Leave Remaining" value={data?.leaveRemaining ?? 0} suffix=" days" progress={data && data.leaveTotal > 0 ? (data.leaveTotal - data.leaveRemaining) / data.leaveTotal : 0} href="/my-work/leaves" icon={<Calendar className="h-4 w-4" />} color="warning" />
          <PermissionGate anyOf={["approvals:approve", "approvals:view"]} fallback={null}>
  <StatCard label="Pending Approvals" value={data?.pendingApprovals ?? 0} href={isAdmin ? "/admin/leave-approvals" : "/my-work/approvals"} icon={<CheckSquare className="h-4 w-4" />} color={data?.pendingApprovals ? "destructive" : "muted"} />
</PermissionGate>
        </div>
      </section>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <ActiveTasksPanel tasks={activeTasks} onToggleTask={handleToggleTask} />
          <FocusLinks />
        </div>

        <div className="space-y-6">
          <AttendanceWidget checkedIn={data?.checkedInToday ?? false} onClockOut={handleClockOut} clockingOut={clockingOut} />
          <QuickActions onOpenLeave={() => setLeaveOpen(true)} onOpenTask={() => setTaskOpen(true)} />
        </div>
      </div>

      <LeaveDialog open={leaveOpen} onOpenChange={setLeaveOpen} onSubmitted={fetchData} />
      <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} onSubmitted={fetchData} />
    </div>
  );
}
