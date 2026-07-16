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
  Users,
  ClipboardCheck,
  ShieldCheck,
  LayoutGrid,
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

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [leaveForm, setLeaveForm] = useState({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "medium", dueDate: "", assignedToId: "" });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [taskSubmitting, setTaskSubmitting] = useState(false);

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
      const profileChecks = [s.phone, s.designation, s.dateOfBirth, s.qualifications, s.skills, s.emergencyContactName, s.bankAccount];
      const filledFields = profileChecks.filter(Boolean).length;
      const totalFields = profileChecks.length;
      const balances = leaveData.balances || [];
      let leaveTotal = balances.reduce((sum: number, b: any) => sum + (b.totalDays || 0), 0);
      let leaveUsed = balances.reduce((sum: number, b: any) => sum + (b.usedDays || 0), 0);
      if (balances.length === 0) { leaveTotal = 18; leaveUsed = 0; }
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

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (data?.showWelcome && !loading) { setTourActive(true); setTourStep(0); }
  }, [data?.showWelcome, loading]);

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
      case "bottom": top = rect.bottom + window.scrollY + 12; left = rect.left + window.scrollX + rect.width / 2 - tooltipW / 2; break;
      case "top": top = rect.top + window.scrollY - tooltipH - 12; left = rect.left + window.scrollX + rect.width / 2 - tooltipW / 2; break;
      case "left": top = rect.top + window.scrollY + rect.height / 2 - tooltipH / 2; left = rect.left + window.scrollX - tooltipW - 12; break;
      case "right": top = rect.top + window.scrollY + rect.height / 2 - tooltipH / 2; left = rect.right + window.scrollX + 12; break;
    }
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipW - 8));
    top = Math.max(8, top);
    setTooltipPos({ top, left });
  }, [tourActive, tourStep]);

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

  async function openLeaveDialog() {
    setLeaveForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
    try { const res = await fetch("/api/leaves/types").then((r) => r.json()); setLeaveTypes(res.leaveTypes || []); }
    catch { setLeaveTypes([]); }
    setLeaveOpen(true);
  }

  function calcDays(start: string, end: string): number {
    if (!start || !end) return 0;
    const s = new Date(start); const e = new Date(end);
    const diff = Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  }

  async function handleLeaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    const daysCount = calcDays(leaveForm.startDate, leaveForm.endDate);
    if (!leaveForm.leaveTypeId || !leaveForm.startDate || !leaveForm.endDate || daysCount <= 0) { toast.error("Please fill all required fields"); return; }
    setLeaveSubmitting(true);
    try {
      const res = await fetch("/api/leaves", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...leaveForm, daysCount }) });
      const body = await res.json();
      if (!res.ok) { toast.error(body.error || "Failed to submit leave"); return; }
      toast.success("Leave request submitted");
      setLeaveOpen(false); fetchData();
    } catch { toast.error("Failed to submit leave"); }
    finally { setLeaveSubmitting(false); }
  }

  async function openTaskDialog() {
    setTaskForm({ title: "", description: "", priority: "medium", dueDate: "", assignedToId: "" });
    try { const res = await fetch("/api/staff").then((r) => r.json()); setStaffList(res.staff || []); }
    catch { setStaffList([]); }
    setTaskOpen(true);
  }

  async function handleTaskSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskForm.title) { toast.error("Title is required"); return; }
    setTaskSubmitting(true);
    try {
      const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: taskForm.title, description: taskForm.description || undefined, priority: taskForm.priority, dueDate: taskForm.dueDate || undefined, assignedToId: taskForm.assignedToId || undefined }) });
      const body = await res.json();
      if (!res.ok) { toast.error(body.error || "Failed to create task"); return; }
      toast.success("Task created");
      setTaskOpen(false); fetchData();
    } catch { toast.error("Failed to create task"); }
    finally { setTaskSubmitting(false); }
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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-20" />)}
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-20" />)}
      </div>
    </div>
  );

  return (
    <div className="flex-1 space-y-8 p-6 lg:p-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between animate-slide-up">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {staff?.firstName}
          </h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <span>{staff?.designation || staff?.role}</span>
            <span className="text-muted-foreground/30">·</span>
            {data?.checkedInToday ? (
              <span className="inline-flex items-center gap-1.5 text-success font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-subtle" />
                Checked in
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-warning font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                Not checked in
              </span>
            )}
          </p>
        </div>
        {data?.showWelcome && (
          <Button size="sm" variant="outline" onClick={() => { setTourActive(true); setTourStep(0); }} className="gap-1.5 shrink-0">
            <Sparkles className="h-3.5 w-3.5" /> Take Tour
          </Button>
        )}
      </div>

      {/* ── Welcome Banner ── */}
      {data?.showWelcome && (
        <Card className="border-primary/15 bg-gradient-to-r from-primary/[0.05] via-primary/[0.02] to-transparent animate-slide-up">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Welcome to ThaibaHive!</p>
                <p className="text-xs text-muted-foreground mt-0.5">Start by marking your attendance or completing your profile.</p>
                <div className="flex gap-2 mt-3">
                  <Link href="/attendance"><Button size="sm">Mark Attendance</Button></Link>
                  <Link href="/staff"><Button variant="outline" size="sm">Complete Profile</Button></Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Stats Grid — always 4 columns ── */}
      <section id="tour-attendance" className="animate-slide-up" style={{ animationDelay: "60ms" }}>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Staff Present (admin) OR Profile (staff) */}
          {isAdmin ? (
            <StatCard
              id="tour-profile"
              label="Staff Present"
              value={data?.todayPresent ?? 0}
              suffix={` / ${data?.staffCount ?? 0}`}
              progress={data && data.staffCount > 0 ? data.todayPresent / data.staffCount : 0}
              href="/admin/attendance-locations"
              icon={<Users className="h-4 w-4" />}
              color="success"
            />
          ) : (
            <StatCard
              id="tour-profile"
              label="Profile"
              value={data?.profileFields.filled ?? 0}
              suffix={` / ${data?.profileFields.total ?? 7}`}
              progress={data ? data.profileFields.filled / data.profileFields.total : 0}
              href={staff ? `/staff/${staff.id}/edit` : "/staff"}
              icon={<ShieldCheck className="h-4 w-4" />}
              color="primary"
            />
          )}
          {/* Card 2: Tasks */}
          <StatCard
            label="Tasks Done"
            value={data?.completedTasks ?? 0}
            suffix={` / ${data?.totalTasks ?? 0}`}
            progress={data && data.totalTasks > 0 ? data.completedTasks / data.totalTasks : 0}
            href="/tasks"
            icon={<ClipboardCheck className="h-4 w-4" />}
            color="info"
          />
          {/* Card 3: Leave */}
          <StatCard
            label="Leave Remaining"
            value={data?.leaveRemaining ?? 0}
            suffix=" days"
            progress={data && data.leaveTotal > 0 ? (data.leaveTotal - data.leaveRemaining) / data.leaveTotal : 0}
            href="/leaves"
            icon={<Calendar className="h-4 w-4" />}
            color="warning"
          />
          {/* Card 4: Approvals */}
          <StatCard
            label="Pending Approvals"
            value={data?.pendingApprovals ?? 0}
            href={isAdmin ? "/admin/leave-approvals" : "/approvals"}
            icon={<CheckSquare className="h-4 w-4" />}
            color={data?.pendingApprovals ? "destructive" : "muted"}
          />
        </div>
      </section>

      {/* ── Quick Actions — always 3 equal columns ── */}
      <section className="space-y-3 animate-slide-up" style={{ animationDelay: "120ms" }}>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Quick Actions</h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {/* Always show all 3 slots — clock out replaces attendance when checked in */}
          {data?.checkedInToday ? (
            <ActionCard
              onClick={handleClockOut}
              disabled={clockingOut}
              icon={<LogOut className="h-5 w-5" />}
              label={clockingOut ? "Processing..." : "Clock Out"}
              desc="End your shift for today"
              colorClass="border-destructive/15 bg-destructive/[0.03] hover:border-destructive/30 hover:bg-destructive/[0.06]"
              iconColorClass="bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-white"
              labelColorClass="text-destructive"
            />
          ) : (
            <Link href="/attendance" className="group flex items-center gap-3 rounded-xl border border-success/15 bg-success/[0.03] p-4 transition-all duration-200 hover:border-success/30 hover:bg-success/[0.06] hover:-translate-y-0.5 hover:shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success group-hover:bg-success group-hover:text-white transition-all duration-200">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-success">Check In</p>
                <p className="text-xs text-muted-foreground">Via mobile app or QR</p>
              </div>
            </Link>
          )}
          <ActionCard
            onClick={openLeaveDialog}
            icon={<CalendarPlus className="h-5 w-5" />}
            label="Apply Leave"
            desc="Submit a quick leave request"
            colorClass="border-warning/15 bg-warning/[0.03] hover:border-warning/30 hover:bg-warning/[0.06]"
            iconColorClass="bg-warning/10 text-warning group-hover:bg-warning group-hover:text-white"
          />
          <ActionCard
            onClick={openTaskDialog}
            icon={<ClipboardPlus className="h-5 w-5" />}
            label="New Task"
            desc="Assign a task to team"
            colorClass="border-info/15 bg-info/[0.03] hover:border-info/30 hover:bg-info/[0.06]"
            iconColorClass="bg-info/10 text-info group-hover:bg-info group-hover:text-white"
          />
        </div>
      </section>

      {/* ── Today's Focus — always 3 equal columns ── */}
      <section className="space-y-3 animate-slide-up" id="tour-tasks" style={{ animationDelay: "180ms" }}>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Today&apos;s Focus</h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3" id="tour-attendance-row">
          <PrimaryAction
            href="/attendance"
            icon={<Clock className="h-5 w-5" />}
            label={data?.checkedInToday ? "Attendance ✓" : "Attendance"}
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

      {/* ── Quick Links — 3-column grid ── */}
      <section className="space-y-3 animate-slide-up" id="tour-shortcuts" style={{ animationDelay: "240ms" }}>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Quick Links</h2>
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {primaryNav.filter((item) => item.href !== "/").slice(0, 6).map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className="group interactive-row flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200">
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
          <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
          <form onSubmit={handleLeaveSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Leave Type *</Label>
              <Select value={leaveForm.leaveTypeId} onChange={(e) => setLeaveForm({ ...leaveForm, leaveTypeId: e.target.value })} required>
                <option value="">Select leave type</option>
                {leaveTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
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
              <p className="text-xs text-muted-foreground">Duration: {calcDays(leaveForm.startDate, leaveForm.endDate)} day(s)</p>
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
          <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
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
                {staffList.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
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
                  <Button size="sm" onClick={() => setTourActive(false)}>Finish</Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ id, label, value, suffix, progress, href, icon, color }: {
  id?: string; label: string; value: number; suffix?: string; progress?: number;
  href: string; icon: React.ReactNode;
  color?: "primary" | "success" | "warning" | "info" | "destructive" | "muted";
}) {
  const colorMap: Record<string, string> = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
  };
  const barMap: Record<string, string> = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    info: "bg-info",
    destructive: "bg-destructive",
    muted: "bg-muted-foreground",
  };
  const c = color || "primary";
  return (
    <Link id={id} href={href} className="interactive-row block group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{label}</p>
        <span className={`${colorMap[c]} opacity-60 group-hover:opacity-100 transition-opacity`}>{icon}</span>
      </div>
      <p className={`text-2xl font-bold tracking-tight ${colorMap[c]}`}>
        {value}
        {suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
      </p>
      {progress !== undefined && (
        <div className="mt-3 h-1 w-full rounded-full bg-border overflow-hidden">
          <div
            className={`h-full rounded-full ${barMap[c]} transition-all duration-700 ease-out`}
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
      )}
    </Link>
  );
}

function ActionCard({ onClick, disabled, icon, label, desc, colorClass, iconColorClass, labelColorClass }: {
  onClick: () => void; disabled?: boolean; icon: React.ReactNode;
  label: string; desc: string; colorClass: string; iconColorClass: string; labelColorClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none w-full ${colorClass}`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${iconColorClass}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${labelColorClass || ""}`}>{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}

function PrimaryAction({ href, icon, label, desc, active, badge }: {
  href: string; icon: React.ReactNode; label: string; desc: string; active?: boolean; badge?: string;
}) {
  return (
    <Link href={href}
      className={`group relative flex items-center gap-4 rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${active ? "border-success/20 bg-success/[0.04]" : "bg-card hover:border-primary/20"}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${active ? "bg-success/15 text-success" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105"}`}>
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
