"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Award,
  CreditCard,
  Filter,
  ArrowLeft,
  User,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

type TimelineItem = {
  id: string;
  type: "attendance" | "leave" | "task" | "report" | "recognition" | "expense";
  title: string;
  description: string;
  date: string;
  metadata: Record<string, unknown>;
};

type StaffDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  designation?: string;
};

export default function StaffTimelinePage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params?.id as string;

  const [staffInfo, setStaffInfo] = useState<StaffDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const fetchData = useCallback(async () => {
    if (!staffId) return;
    setLoading(true);
    try {
      const [staffRes, timelineRes] = await Promise.all([
        api.get<{ staff: StaffDetail }>(`/api/staff/${staffId}`, { toast: false }),
        api.get<{ timeline: TimelineItem[] }>(`/api/staff/${staffId}/timeline`, { toast: false }),
      ]);

      if (staffRes.ok && staffRes.data?.staff) {
        setStaffInfo(staffRes.data.staff);
      }
      if (timelineRes.ok && timelineRes.data?.timeline) {
        setTimeline(timelineRes.data.timeline);
      }
    } catch (err) {
      console.error("Failed to load staff timeline:", err);
      toast.error("Failed to load staff timeline");
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTimeline = timeline.filter((item) => {
    if (activeFilter === "all") return true;
    return item.type === activeFilter;
  });

  const getIcon = (type: TimelineItem["type"]) => {
    switch (type) {
      case "attendance":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "leave":
        return <Calendar className="h-5 w-5 text-amber-500" />;
      case "task":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "report":
        return <FileText className="h-5 w-5 text-purple-500" />;
      case "recognition":
        return <Award className="h-5 w-5 text-yellow-500" />;
      case "expense":
        return <CreditCard className="h-5 w-5 text-rose-500" />;
    }
  };

  const getTypeBadge = (type: TimelineItem["type"]) => {
    switch (type) {
      case "attendance":
        return <Badge variant="info">Attendance</Badge>;
      case "leave":
        return <Badge variant="warning">Leave</Badge>;
      case "task":
        return <Badge variant="success">Task</Badge>;
      case "report":
        return <Badge variant="secondary">Daily Report</Badge>;
      case "recognition":
        return <Badge className="bg-amber-500 text-white">Recognition</Badge>;
      case "expense":
        return <Badge variant="destructive">Expense</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/staff/${staffId}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Staff Profile
        </Button>
      </div>

      <PageHeader
        title={
          staffInfo
            ? `${staffInfo.firstName} ${staffInfo.lastName} — Activity Timeline`
            : "Staff Activity Timeline"
        }
        description={
          staffInfo
            ? `Employee ID: ${staffInfo.employeeId} | ${staffInfo.designation || staffInfo.email}`
            : "Chronological log of activities, attendance, tasks, and requests"
        }
      />

      {/* FILTER BAR */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium flex items-center gap-1.5 mr-2 text-muted-foreground">
            <Filter className="h-4 w-4" /> Filter by Type:
          </span>
          {[
            { id: "all", label: "All Activities" },
            { id: "attendance", label: "Attendance" },
            { id: "leave", label: "Leaves" },
            { id: "task", label: "Tasks" },
            { id: "report", label: "Daily Reports" },
            { id: "recognition", label: "Recognition" },
            { id: "expense", label: "Expenses" },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeFilter === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* TIMELINE VIEW */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredTimeline.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-slate-400" />
          <h3 className="text-lg font-semibold">No activity items found</h3>
          <p className="text-sm mt-1">There are no logged activities matching the selected filter.</p>
        </Card>
      ) : (
        <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-6">
          {filteredTimeline.map((item) => (
            <div key={item.id} className="relative group">
              {/* TIMELINE DOT */}
              <div className="absolute -left-[31px] top-1.5 h-8 w-8 rounded-full bg-background border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center shadow-xs group-hover:border-primary transition-colors">
                {getIcon(item.type)}
              </div>

              {/* CARD CONTENT */}
              <Card className="ml-2 hover:shadow-md transition-shadow">
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold">
                      {item.title}
                    </CardTitle>
                    {getTypeBadge(item.type)}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {item.date ? new Date(item.date).toLocaleString() : ""}
                  </span>
                </CardHeader>
                <CardContent className="py-2 px-4 text-sm text-slate-600 dark:text-slate-300">
                  {item.description}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
