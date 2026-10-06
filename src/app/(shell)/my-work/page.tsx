"use client";

import { Clock, CheckSquare, FileText, Calendar, Coffee, ThumbsUp as ApprovalsIcon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { QuickActionCard } from "@/components/ui/quick-action-card";

const quickActions = [
  { icon: Clock, label: "Punch In", color: "bg-green-500", route: "/my-work/attendance", permission: "attendance:punch.create" },
  { icon: Calendar, label: "Request Leave", color: "bg-blue-500", route: "/my-work/leaves", permission: "leave.request.create" },
  { icon: CheckSquare, label: "My Tasks", color: "bg-purple-500", route: "/my-work/tasks", permission: "task.item.view" },
  { icon: FileText, label: "Submit Report", color: "bg-orange-500", route: "/my-work/reports", permission: "report.daily.submit" },
  { icon: ApprovalsIcon, label: "Approvals", color: "bg-amber-500", route: "/my-work/approvals", permission: "approvals:approve" },
  { icon: Coffee, label: "Order Meal", color: "bg-orange-600", route: "/my-work/canteen", permission: "canteen.order.create" },
];

export default function MyWorkDashboard() {
  const { staff } = useAuth();
  const user = staff;
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

  const filteredActions = quickActions.filter((action) => {
    if (!action.permission) return true;
    // Permission check would be done via PermissionGate in production
    return true;
  });

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting}, {user?.firstName ?? "Staff"}</h1>
          <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening today</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/my-work/approvals" className="btn btn-outline btn-sm">
            View All Approvals
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Attendance" value="98.5%" subtitle="This month" icon="CheckCircle" color="text-green-500" />
        <StatCard title="Leave Balance" value="12 days" subtitle="Casual + Medical" icon="Calendar" color="text-blue-500" />
        <StatCard title="Pending Tasks" value="3" subtitle="Due this week" icon="CheckSquare" color="text-amber-500" />
        <StatCard title="Approvals" value="2" subtitle="Awaiting action" icon="ThumbsUp" color="text-amber-500" />
      </div>

      {/* Quick Actions */}
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

      {/* Today's Schedule */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Today&apos;s Schedule</h2>
        <div className="bg-card border rounded-xl p-6">
          <p className="text-muted-foreground">No classes scheduled today. Enjoy your day!</p>
        </div>
      </section>

      {/* Latest Updates */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Latest Updates</h2>
        <div className="space-y-3">
          <UpdateCard
            title="Mid-term Examination Schedule Released"
            desc="The mid-term examination schedule for Term 2 has been published. Please check the examination portal for your specific dates and venues."
            time="2 hours ago"
            category="ANNOUNCEMENT"
          />
          <UpdateCard
            title="New Leave Policy Effective Next Month"
            desc="Updated casual leave accrual rates and carry-forward limits. Review the updated policy document."
            time="1 day ago"
            category="POLICY"
          />
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
      case "CheckCircle": return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case "Calendar": return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
      case "CheckSquare": return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
      case "ThumbsUp": return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>;
      default: return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
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

function UpdateCard({
  title,
  desc,
  time,
  category,
}: {
  title: string;
  desc: string;
  time: string;
  category: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary">ⓘ</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider rounded-full bg-primary/10 text-primary px-2 py-0.5">
              {category}
            </span>
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>
          <p className="text-sm font-medium mt-1">{title}</p>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{desc}</p>
        </div>
      </div>
    </div>
  );
}