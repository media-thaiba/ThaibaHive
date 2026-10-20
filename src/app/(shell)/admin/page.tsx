"use client";

import { Bot, Smartphone, Database, Shield, Settings, Key } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { QuickActionCard } from "@/components/ui/quick-action-card";

const quickActions = [
  { icon: Bot, label: "Agent Cockpit", color: "bg-purple-500", route: "/admin/agents", permission: "agent:workflows:view" },
  { icon: Smartphone, label: "Hardware Mgmt", color: "bg-blue-500", route: "/admin/hardware", permission: "admin:all" },
  { icon: Database, label: "Audit Ledgers", color: "bg-emerald-500", route: "/admin/audit", permission: "admin:audit" },
  { icon: Shield, label: "Security Center", color: "bg-red-500", route: "/admin/security", permission: "system:security:view" },
  { icon: Settings, label: "Tenant Settings", color: "bg-amber-500", route: "/admin/institutions", permission: "admin:all" },
  { icon: Key, label: "Key Management", color: "bg-violet-500", route: "/admin/keys", permission: "system:admin" },
];

export default function AdminDashboard() {
  const filteredActions = quickActions.filter((action) => {
    if (!action.permission) return true;
    return true;
  });

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
          <p className="text-muted-foreground mt-1">Agents, hardware, audit, security & tenant settings</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Active Agents" value="12" subtitle="3 workflows running" icon="Bot" color="text-purple-500" />
        <StatCard title="NFC Cards Issued" value="1,234" subtitle="56 this month" icon="Smartphone" color="text-blue-500" />
        <StatCard title="Audit Events (24h)" value="2,847" subtitle="All verified" icon="Database" color="text-emerald-500" />
        <StatCard title="Security Alerts" value="3" subtitle="2 acknowledged" icon="Shield" color="text-red-500" />
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
          <h3 className="text-lg font-semibold mb-4">Recent Agent Activity</h3>
          <div className="space-y-3">
            <AgentRow name="Attendance Reconciliation" status="Running" progress={65} runs="1,234" />
            <AgentRow name="Fee Reconciliation" status="Completed" progress={100} runs="89" />
            <AgentRow name="Leave Approval Bot" status="Idle" progress={0} runs="45" />
            <AgentRow name="Grade Publishing" status="Failed" progress={100} runs="12" error="Timeout on grade 10B" />
          </div>
          <Link href="/admin/agents" className="btn btn-outline btn-sm mt-4 w-full text-center">View All Agents</Link>
        </div>

        <div className="bg-card border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">System Health</h3>
          <div className="space-y-4">
            <HealthRow label="Database" status="Healthy" latency="12ms" />
            <HealthRow label="Redis Cache" status="Healthy" latency="3ms" />
            <HealthRow label="Message Queue" status="Healthy" latency="8ms" />
            <HealthRow label="WebSocket" status="Degraded" latency="45ms" detail="2 connections dropped" />
            <HealthRow label="File Storage" status="Healthy" usage="67%" />
            <HealthRow label="API Latency (p95)" status="Healthy" latency="145ms" />
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
      case "Bot": return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.429 5l-1.286.667A4.5 4.5 0 0112 21a4.5 4.5 0 01-6.143-5.667L5 5m0 0l1.286.667A4.5 4.5 0 0112 3a4.5 4.5 0 016.143 5.667L19 5m0 0l-1.286.667A4.5 4.5 0 0012 21a4.5 4.5 0 006.143-5.667L19 5" /></svg>;
      case "Smartphone": return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
      case "Database": return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>;
case "Shield": return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
      default: return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>;
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

function AgentRow({
  name,
  status,
  progress,
  runs,
  error,
}: {
  name: string;
  status: string;
  progress: number;
  runs: string;
  error?: string;
}) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case "Running": return "bg-blue-100 text-blue-700";
      case "Completed": return "bg-green-100 text-green-700";
      case "Idle": return "bg-gray-100 text-gray-700";
      case "Failed": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium">{name}</p>
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getStatusColor(status))}>
          {status}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full bg-primary transition-all duration-300", progress === 0 ? "w-0" : "")} style={{ width: `${progress}%` }} />
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>{runs} runs</span>
        {error && <span className="text-red-500">{error}</span>}
      </div>
    </div>
  );
}

function HealthRow({
  label,
  status,
  latency,
  usage,
  detail,
}: {
  label: string;
  status: string;
  latency?: string;
  usage?: string;
  detail?: string;
}) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case "Healthy": return "bg-green-100 text-green-700";
      case "Degraded": return "bg-amber-100 text-amber-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <div>
        <p className="font-medium">{label}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getStatusColor(status))}>
          {status}
        </span>
        {latency && <span className="text-sm font-mono text-muted-foreground">{latency}</span>}
        {usage && <span className="text-sm font-mono text-muted-foreground">{usage}</span>}
      </div>
    </div>
  );
}