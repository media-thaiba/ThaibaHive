"use client";

import { Landmark, Percent, ShoppingCart, Wallet, Scale, Truck, Briefcase, Wrench, ShoppingCart as ProcurementIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickActionCard } from "@/components/ui/quick-action-card";

const quickActions = [
  { icon: Landmark, label: "Finance Dashboard", color: "bg-emerald-500", route: "/operations/finance", permission: "finance:read" },
  { icon: Percent, label: "Tax Rates", color: "bg-teal-500", route: "/operations/finance/tax", permission: "finance:tax:view" },
  { icon: ShoppingCart, label: "Purchase Approvals", color: "bg-amber-500", route: "/operations/finance/purchases", permission: "finance:purchases:approve:tier1" },
  { icon: Wallet, label: "Payroll", color: "bg-blue-500", route: "/operations/finance/payroll", permission: "finance:payroll:view" },
  { icon: Scale, label: "Reconciliation", color: "bg-purple-500", route: "/operations/finance/reconciliation", permission: "finance:reconciliation:view" },
  { icon: Truck, label: "Fleet", color: "bg-indigo-500", route: "/operations/fleet", permission: "fleet:read" },
  { icon: Briefcase, label: "Assets", color: "bg-cyan-500", route: "/operations/assets", permission: "assets:read" },
  { icon: ProcurementIcon, label: "Procurement", color: "bg-orange-500", route: "/operations/procurement", permission: "finance:purchases:create" },
  { icon: Wrench, label: "Facilities", color: "bg-gray-500", route: "/operations/facilities", permission: "helpdesk:read" },
];

export default function OperationsDashboard() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operations Dashboard</h1>
          <p className="text-muted-foreground mt-1">Finance, fleet, assets, procurement & facilities</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue (MTD)" value="₹42.3L" subtitle="+12.5% vs last month" icon="Landmark" color="text-emerald-500" />
        <StatCard title="Outstanding Receivables" value="₹8.7L" subtitle="45 overdue accounts" icon="ShoppingCart" color="text-amber-500" />
        <StatCard title="Active Purchase Orders" value="23" subtitle="5 awaiting approval" icon="ShoppingCart" color="text-blue-500" />
        <StatCard title="Fleet Utilization" value="78%" subtitle="12 of 15 vehicles active" icon="Truck" color="text-indigo-500" />
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

      <section className="mt-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Financial Activity</h3>
          <div className="space-y-3">
            <FinancialRow type="Fee Collection" amount="₹2.3L" desc="Grade 10 Term 2 fees" status="Completed" time="15 min ago" />
            <FinancialRow type="Vendor Payment" amount="₹45,000" desc="Office supplies - Vendor ABC" status="Pending" time="1 hour ago" />
            <FinancialRow type="Payroll Disbursement" amount="₹18.5L" desc="October 2026 salary" status="Processing" time="3 hours ago" />
            <FinancialRow type="Expense Claim" amount="₹12,500" desc="Travel - Conference Delhi" status="Approved" time="5 hours ago" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <MetricRow label="Fee Collection Rate" value="92.4%" trend="+2.1%" positive />
            <MetricRow label="Procurement Cycle" value="4.2 days" trend="-0.5 days" positive />
            <MetricRow label="Asset Utilization" value="87%" trend="+3%" positive />
            <MetricRow label="Fleet Availability" value="80%" trend="-2%" positive={false} />
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
      case "Landmark": return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H6a1 1 0 01-1-1v-5a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H6a1 1 0 01-1-1v-5a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H6a1 1 0 01-1-1v-5a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H6a1 1 0 01-1-1v-5a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H6a1 1 0 01-1-1v-5a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H6a1 1 0 01-1-1v-5a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H6a1 1 0 01-1-1v-5a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H6a1 1 0 01-1-1v-5a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H6a1 1 0 01-1-1v-5z" /></svg>;
      case "ShoppingCart": return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a2 2 0 00-2-2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2v-5" /></svg>;
      case "Truck": return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
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

function FinancialRow({
  type,
  amount,
  desc,
  status,
  time,
}: {
  type: string;
  amount: string;
  desc: string;
  status: string;
  time: string;
}) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case "Completed": return "bg-green-100 text-green-700";
      case "Pending": return "bg-amber-100 text-amber-700";
      case "Processing": return "bg-blue-100 text-blue-700";
      case "Approved": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <div>
        <p className="font-medium">{type}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold">{amount}</p>
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getStatusColor(status))}>
          {status}
        </span>
        <p className="text-xs text-muted-foreground mt-1">{time}</p>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  trend,
  positive,
}: {
  label: string;
  value: string;
  trend: string;
  positive: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">vs last period</p>
      </div>
      <div className="text-right">
        <p className="text-xl font-bold">{value}</p>
        <p className={cn("text-xs font-medium", positive ? "text-green-600" : "text-red-600")}>
          {trend}
        </p>
      </div>
    </div>
  );
}