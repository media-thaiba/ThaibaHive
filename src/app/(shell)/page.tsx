"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { primaryNav } from "@/config/navigation";
import { toast } from "sonner";
import {
  Clock,
  CheckSquare,
  HelpCircle,
  ChevronRight,
  Sparkles,
  ArrowRight,
  LogOut,
  CalendarPlus,
  ClipboardPlus,
  Circle,
  X,
  ChevronLeft,
  TrendingUp,
  Calendar,
} from "lucide-react";

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
  showWelcome: boolean;
};

type StaffMember = { id: string; firstName: string; lastName: string };
type LeaveType = { id: string; name: string };

type TourStep = {
  targetId: string;
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right";
};

const TOUR_STEPS: TourStep[] = [
  { targetId: "tour-profile", title: "Profile Status", content: "Track your profile completion progress here.", position: "bottom" },
  { targetId: "tour-attendance", title: "Attendance", content: "Quickly check in/out and view your attendance status.", position: "bottom" },
  { targetId: "tour-tasks", title: "My Tasks", content: "View and manage your assigned tasks.", position: "bottom" },
  { targetId: "tour-shortcuts", title: "Shortcuts", content: "Quick navigation to all major sections of the app.", position: "top" },
];

export default function DashboardPage() {
  const { staff } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Quick Actions state
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [leaveForm, setLeaveForm] = useState({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "medium", dueDate: "", assignedToId: "" });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Tour state
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(() => {
    if (!staff) return;
    Promise.all([
      fetch("/api/staff").then((r) => r.json()).catch(() => ({ staff: [] })),
      fetch("/api/attendance/my").then((r) => r.json()).catch(() => ({})),
      fetch("/api/tasks").then((r) => r.json()).catch(() => ({ tasks: [] })),
      fetch("/api/approvals").then((r) => r.json()).catch(() => ({ approvals: [] })),
      fetch("/api/leaves/balances").then((r) => r.json()).catch(() => ({ balances: [] })),
      fetch("/api/attendance/logs").then((r) => r.json()).catch(() => ({ logs: [] })),
    ]).then(([staffData, attData, taskData, approvalData, leaveData, logData]) => {
      const tasks = taskData.tasks || [];
      const completedTasks = tasks.filter((t: { status: string; assignedToId: string }) => t.status === "completed" && t.assignedToId === staff.id).length;
      
      const hasCheckedIn = !!attData.todayLog;

      const s = staffData.staff?.find((st: { id: string }) => st.id === staff.id) || staff;
      const profileChecks = [s.phone, s.designation, s.dateOfBirth, s.qualifications,
        s.skills, s.emergencyContactName, s.bankAccount];
      const filledFields = profileChecks.filter(Boolean).length;
      const totalFields = profileChecks.length;

      const balances = leaveData.balances || [];
      let leaveTotal = balances.reduce((sum: number, b: any) => sum + (b.totalDays || 0), 0);
      let leaveUsed = balances.reduce((sum: number, b: any) => sum + (b.usedDays || 0), 0);

      if (balances.length === 0) {
        leaveTotal = 18;
        leaveUsed = 0;
      }
      const leaveRemaining = leaveTotal - leaveUsed;

      const todayStr = new Date().toISOString().split("T")[0];
      const allLogs = logData.logs || [];
      const presentTodayCount = allLogs.filter((l: any) => l.date === todayStr && l.checkIn).length;

      const myTasks = tasks.filter((t: { assignedToId: string }) => t.assignedToId === staff.id);

      setData({
        staffCount: staffData.staff?.length || 0,
        todayPresent: presentTodayCount,
        pendingApprovals: approvalData.approvals?.length || 0,
        myPendingTasks: myTasks.filter((t: { status: string }) => t.status !== "completed").length,
        completedTasks,
        totalTasks: myTasks.length,
        checkedInToday: hasCheckedIn,
        profileFields: { filled: filledFields, total: totalFields },
        leaveRemaining,
        leaveTotal,
        hasCheckedIn,
        showWelcome: !hasCheckedIn && myTasks.length === 0,
      });
      setLoading(false);
    });
  }, [staff]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-trigger tour for first login
  useEffect(() => {
    if (data?.showWelcome && !loading) {
      setTourActive(true);
      setTourStep(0);
    }
  }, [data?.showWelcome, loading]);

  // Position tooltip
  useEffect(() => {
    if (!tourActive) return;
    const step = TOUR_STEPS[tourStep];
    if (!step) return;
    const el = document.getElementById(step.targetId);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;
    const tooltipH = tooltipEl?.offsetHeight || 120;
    const tooltipW = tooltipEl?.offsetWidth || 280;
    let top = 0, left = 0;
    switch (step.position) {
      case "bottom":
        top = rect.bottom + window.scrollY + 12;
        left = rect.left + window.scrollX + rect.width / 2 - tooltipW / 2;
        break;
      case "top":
        top = rect.top + window.scrollY - tooltipH - 12;
        left = rect.left + window.scrollX + rect.width / 2 - tooltipW / 2;
        break;
      case "left":
        top = rect.top + window.scrollY + rect.height / 2 - tooltipH / 2;
        left = rect.left + window.scrollX - tooltipW - 12;
        break;
      case "right":
        top = rect.top + window.scrollY + rect.height / 2 - tooltipH / 2;
        left = rect.right + window.scrollX + 12;
        break;
    }
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipW - 8));
    top = Math.max(8, top);
    setTooltipPos({ top, left });
  }, [tourActive, tourStep]);

  // Clock Out handler
  async function handleClockOut() {
    setClockingOut(true);
    try {
      const res = await fetch("/api/attendance/check-out", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || "Failed to clock out");
        return;
      }
      toast.success("Clocked out successfully");
      fetchData();
    } catch {
      toast.error("Failed to clock out");
    } finally {
      setClockingOut(false);
    }
  }

  // Open Leave dialog & fetch types
  async function openLeaveDialog() {
    setLeaveForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
    try {
      const res = await fetch("/api/leaves/types").then((r) => r.json());
      setLeaveTypes(res.leaveTypes || []);
    } catch {
      setLeaveTypes([]);
    }
    setLeaveOpen(true);
  }

  // Calculate days count
  function calcDays(start: string, end: string): number {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  }

  // Submit Leave
  async function handleLeaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    const daysCount = calcDays(leaveForm.startDate, leaveForm.endDate);
    if (!leaveForm.leaveTypeId || !leaveForm.startDate || !leaveForm.endDate || daysCount <= 0) {
      toast.error("Please fill all required fields");
      return;
    }
    setLeaveSubmitting(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...leaveForm, daysCount }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || "Failed to submit leave");
        return;
      }
      toast.success("Leave request submitted");
      setLeaveOpen(false);
      fetchData();
    } catch {
      toast.error("Failed to submit leave");
    } finally {
      setLeaveSubmitting(false);
    }
  }

  // Open Task dialog & fetch staff
  async function openTaskDialog() {
    setTaskForm({ title: "", description: "", priority: "medium", dueDate: "", assignedToId: "" });
    try {
      const res = await fetch("/api/staff").then((r) => r.json());
      setStaffList(res.staff || []);
    } catch {
      setStaffList([]);
    }
    setTaskOpen(true);
  }

  // Submit Task
  async function handleTaskSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskForm.title) {
      toast.error("Title is required");
      return;
    }
    setTaskSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description || undefined,
          priority: taskForm.priority,
          dueDate: taskForm.dueDate || undefined,
          assignedToId: taskForm.assignedToId || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || "Failed to create task");
        return;
      }
      toast.success("Task created");
      setTaskOpen(false);
      fetchData();
    } catch {
      toast.error("Failed to create task");
    } finally {
      setTaskSubmitting(false);
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading) return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <Skeleton className="h-8 w-72" />
      <SkeletonCard className="h-28" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-24" />)}
      </div>
    </div>
  );

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      {/* Greeting Header */}
      <div className="space-y-1 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}, {staff?.firstName}
        </h1>
        <p className="text-muted-foreground text-sm">
          {staff?.designation || staff?.role}
          {data?.checkedInToday ? (
            <span className="ml-2 inline-flex items-center gap-1 text-success font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-subtle" />
              Checked in
            </span>
          ) : (
            <span className="ml-2 inline-flex items-center gap-1 text-warning font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" />
              Not checked in
            </span>
          )}
        </p>
      </div>

      {/* Welcome Banner */}
      {data?.showWelcome && (
        <Card className="border-primary/15 bg-gradient-to-r from-primary/[0.04] via-primary/[0.02] to-transparent animate-slide-up">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Welcome to ThaibaHive!</p>
                <p className="text-xs text-muted-foreground mt-0.5">Start by marking your attendance or checking your tasks.</p>
                <div className="flex gap-2 mt-3">
                  <Link href="/attendance"><Button size="sm">Mark Attendance</Button></Link>
                  <Link href="/staff"><Button variant="outline" size="sm">Complete Profile</Button></Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-3 stagger-children">
          {data?.checkedInToday && (
            <button
              onClick={handleClockOut}
              disabled={clockingOut}
              className="group flex items-center gap-3 rounded-xl border border-destructive/15 bg-destructive/[0.03] p-4 text-left transition-all duration-200 hover:border-destructive/30 hover:bg-destructive/[0.06] hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-destructive-foreground transition-all duration-200">
                <LogOut className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-destructive">Clock Out</p>
                <p className="text-xs text-muted-foreground">{clockingOut ? "Processing..." : "End your shift"}</p>
              </div>
            </button>
          )}
          <button
            onClick={openLeaveDialog}
            className="group flex items-center gap-3 rounded-xl border border-warning/15 bg-warning/[0.03] p-4 text-left transition-all duration-200 hover:border-warning/30 hover:bg-warning/[0.06] hover:-translate-y-0.5 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning group-hover:bg-warning group-hover:text-warning-foreground transition-all duration-200">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Apply Leave</p>
              <p className="text-xs text-muted-foreground">Quick leave request</p>
            </div>
          </button>
          <button
            onClick={openTaskDialog}
            className="group flex items-center gap-3 rounded-xl border border-info/15 bg-info/[0.03] p-4 text-left transition-all duration-200 hover:border-info/30 hover:bg-info/[0.06] hover:-translate-y-0.5 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info group-hover:bg-info group-hover:text-info-foreground transition-all duration-200">
              <ClipboardPlus className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">New Task</p>
              <p className="text-xs text-muted-foreground">Assign a task</p>
            </div>
          </button>
        </div>
      </section>

      {/* Today's Focus */}
      <section className="space-y-3" id="tour-tasks">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Today&apos;s Focus</h2>
        <div className="grid gap-3 sm:grid-cols-3 stagger-children">
          <PrimaryAction
            href="/attendance"
            icon={<Clock className="h-5 w-5" />}
            label={data?.checkedInToday ? "Checked In" : "Attendance"}
            desc={data?.checkedInToday ? "You're set for today" : "Check-in via mobile app"}
            active={data?.checkedInToday}
          />
          <PrimaryAction
            href="/tasks"
            icon={<CheckSquare className="h-5 w-5" />}
            label="My Tasks"
            desc={data?.myPendingTasks ? `${data.myPendingTasks} pending` : "All caught up"}
            badge={data?.myPendingTasks ? String(data.myPendingTasks) : undefined}
          />
          <PrimaryAction
            href="/help-desk"
            icon={<HelpCircle className="h-5 w-5" />}
            label="Get Support"
            desc="IT & facility help tickets"
          />
        </div>
      </section>

      {/* Stats Grid */}
      <section className="stagger-children" id="tour-attendance">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {staff && ["super_admin", "admin", "principal", "hod"].includes(staff.role) ? (
            <div id="tour-profile">
              <StatCard
                label="Staff Present"
                value={data?.todayPresent ?? 0}
                suffix={` / ${data?.staffCount ?? 0}`}
                progress={data && data.staffCount > 0 ? data.todayPresent / data.staffCount : 0}
                href="/admin/attendance-locations"
                icon={<TrendingUp className="h-4 w-4" />}
              />
            </div>
          ) : (
            <div id="tour-profile">
              <StatCard
                label="Profile"
                value={data?.profileFields.filled ?? 0}
                suffix={` / ${data?.profileFields.total ?? 7}`}
                progress={data ? data.profileFields.filled / data.profileFields.total : 0}
                href={staff ? `/staff/${staff.id}/edit` : "/staff"}
                icon={<CheckSquare className="h-4 w-4" />}
              />
            </div>
          )}
          <StatCard
            label="Tasks Done"
            value={data?.completedTasks ?? 0}
            suffix={` / ${data?.totalTasks ?? 0}`}
            progress={data && data.totalTasks > 0 ? data.completedTasks / data.totalTasks : 0}
            href="/tasks"
            icon={<CheckSquare className="h-4 w-4" />}
          />
          <StatCard
            label="Leave Left"
            value={data?.leaveRemaining ?? 0}
            suffix=" days"
            progress={data && data.leaveTotal > 0 ? (data.leaveTotal - data.leaveRemaining) / data.leaveTotal : 0}
            href="/leaves"
            icon={<Calendar className="h-4 w-4" />}
          />
          <StatCard
            label="Approvals"
            value={data?.pendingApprovals ?? 0}
            href={staff && ["super_admin", "admin", "principal", "hod"].includes(staff.role) ? "/admin/leave-approvals" : "/approvals"}
            icon={<HelpCircle className="h-4 w-4" />}
          />
        </div>
      </section>

      {/* Shortcuts */}
      <section className="space-y-3" id="tour-shortcuts">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Quick Links</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {primaryNav.filter((item) => item.href !== "/").slice(0, 6).map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className="group interactive-row flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-caption truncate">{item.desc}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── Quick Leave Dialog ─── */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLeaveSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Leave Type *</Label>
              <Select value={leaveForm.leaveTypeId} onChange={(e) => setLeaveForm({ ...leaveForm, leaveTypeId: e.target.value })} required>
                <option value="">Select leave type</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>{lt.name}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date *</Label>
                <Input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>End Date *</Label>
                <Input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} required />
              </div>
            </div>
            {leaveForm.startDate && leaveForm.endDate && (
              <p className="text-xs text-muted-foreground">
                Duration: {calcDays(leaveForm.startDate, leaveForm.endDate)} day(s)
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea placeholder="Reason for leave (optional)" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLeaveOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={leaveSubmitting}>{leaveSubmitting ? "Submitting..." : "Submit Request"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Quick Task Dialog ─── */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTaskSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Task description (optional)" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Assign To</Label>
              <Select value={taskForm.assignedToId} onChange={(e) => setTaskForm({ ...taskForm, assignedToId: e.target.value })}>
                <option value="">Unassigned</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTaskOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={taskSubmitting}>{taskSubmitting ? "Creating..." : "Create Task"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Guided Tour Overlay ─── */}
      {tourActive && (
        <>
          <div className="fixed inset-0 z-[var(--z-overlay)] bg-black/30 backdrop-blur-sm" onClick={() => setTourActive(false)} />
          <div
            ref={tooltipRef}
            className="fixed z-[var(--z-tooltip)] w-72 rounded-xl border bg-popover p-4 shadow-lg animate-in fade-in-0 zoom-in-95 duration-200"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm font-semibold">{TOUR_STEPS[tourStep]?.title}</p>
              <button onClick={() => setTourActive(false)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{TOUR_STEPS[tourStep]?.content}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((_, i) => (
                  <Circle key={i} className={`h-2 w-2 transition-colors ${i === tourStep ? "fill-primary text-primary" : "fill-muted text-muted-foreground"}`} />
                ))}
              </div>
              <div className="flex gap-1.5">
                {tourStep > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setTourStep((s) => s - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Back
                  </Button>
                )}
                {tourStep < TOUR_STEPS.length - 1 ? (
                  <Button size="sm" onClick={() => setTourStep((s) => s + 1)}>
                    Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setTourActive(false)}>
                    Finish
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PrimaryAction({ href, icon, label, desc, active, badge }: {
  href: string; icon: React.ReactNode; label: string; desc: string; active?: boolean; badge?: string;
}) {
  return (
    <Link href={href}
      className={`group relative flex items-center gap-4 rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
        active ? "border-success/20 bg-success/[0.04]" : "bg-card hover:border-primary/15"
      }`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
        active ? "bg-success/15 text-success" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105"
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{label}</p>
          {badge && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {badge}
            </span>
          )}
        </div>
        <p className="text-caption mt-0.5">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-200" />
    </Link>
  );
}

function StatCard({ label, value, suffix, progress, href, icon }: {
  label: string; value: number; suffix?: string; progress?: number; href: string; icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="interactive-row block group">
      <div className="flex items-center justify-between mb-2">
        <p className="text-caption">{label}</p>
        <span className="text-muted-foreground/50 group-hover:text-primary transition-colors">{icon}</span>
      </div>
      <p className="text-xl font-bold tracking-tight">
        {value}{suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
      </p>
      {progress !== undefined && (
        <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
      )}
    </Link>
  );
}
