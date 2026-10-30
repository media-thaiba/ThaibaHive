"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Users, Layers, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectItem } from "@/components/ui/select";
import { SkeletonCard } from "@/components/ui/skeleton";

export type Institution = { id: string; name: string };

export type StatCardData = {
  title: string;
  value: string;
  icon: "users" | "layers" | "calendar";
  color: string;
  iconColor: string;
};

interface SchoolDashboardClientProps {
  institutions: Institution[];
  selectedInstitutionId: string | null;
  stats: { totalStudents: number; totalClasses: number; activeYears: number };
}

const iconMap = {
  users: Users,
  layers: Layers,
  calendar: CalendarDays,
};

export function SchoolDashboardClient({
  institutions,
  selectedInstitutionId,
  stats,
}: SchoolDashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selected, setSelected] = useState(selectedInstitutionId ?? "");

  useEffect(() => {
    setSelected(searchParams.get("institutionId") || "");
  }, [searchParams]);

  const handleChange = (val: string) => {
    setSelected(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set("institutionId", val);
    } else {
      params.delete("institutionId");
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const statCards = [
    { title: "Total Students", value: String(stats.totalStudents), icon: "users" as const, color: "bg-blue-100", iconColor: "text-blue-500" },
    { title: "Active Classes", value: String(stats.totalClasses), icon: "layers" as const, color: "bg-indigo-100", iconColor: "text-indigo-500" },
    { title: "Active Academic Years", value: String(stats.activeYears), icon: "calendar" as const, color: "bg-emerald-100", iconColor: "text-emerald-500" },
  ];

  return (
    <>
      <PageHeader
        title="Academic Dashboard"
        description="Manage students, classes, exams & grades"
        actions={
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-foreground/60 uppercase tracking-wider">
              Institution
            </span>
            <Select
              value={selected}
              onChange={(e) => handleChange(e.target.value)}
              className="w-64 text-sm"
            >
              <SelectItem value="">All Institutions</SelectItem>
              {institutions.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
              ))}
            </Select>
            {isPending && <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = iconMap[card.icon];
          return (
            <div key={card.title} className="bg-card border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className={cn("p-2 rounded-lg", card.color)}>
                  <Icon className={cn("h-5 w-5", card.iconColor)} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.title}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
