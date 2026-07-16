"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type TimelineItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  metadata: Record<string, unknown>;
};

const typeConfig: Record<string, { variant: "success" | "info" | "warning" | "default" | "secondary" | "destructive"; icon: string }> = {
  attendance: { variant: "success", icon: "⏱" },
  leave: { variant: "default", icon: "🏖" },
  task: { variant: "info", icon: "📋" },
  report: { variant: "warning", icon: "📄" },
  recognition: { variant: "secondary", icon: "⭐" },
  expense: { variant: "info", icon: "💰" },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getGroupLabel(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  if (d >= startOfWeek) return "This Week";

  return "Earlier";
}

export default function TimelinePage() {
  const { staff: currentUser } = useAuth();
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) return;
    fetch(`/api/staff/${currentUser.id}/timeline`)
      .then((r) => r.json())
      .then((data) => setTimeline(data.timeline ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  const grouped: Record<string, TimelineItem[]> = {};
  for (const item of timeline) {
    const label = getGroupLabel(item.date);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(item);
  }

  const groupOrder = ["Today", "Yesterday", "This Week", "Earlier"];

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Staff Timeline</h1>
        <p className="text-sm text-muted-foreground mt-1">Your recent activity across the platform</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-72" />
              </div>
            </div>
          ))}
        </div>
      ) : timeline.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-3xl mb-3">📭</p>
            <p className="text-sm text-muted-foreground">No activity yet</p>
          </CardContent>
        </Card>
      ) : (
        groupOrder.map(
          (group) =>
            grouped[group] && (
              <section key={group}>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">{group}</h2>
                <div className="relative pl-8 space-y-4 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
                  {grouped[group].map((item) => {
                    const cfg = typeConfig[item.type] ?? { variant: "secondary" as const, icon: "📌" };
                    return (
                      <div key={item.id} className="relative">
                        <div className="absolute -left-8">
                          <Badge variant={cfg.variant} className="h-7 w-7 flex items-center justify-center rounded-full p-0 text-xs">
                            {cfg.icon}
                          </Badge>
                        </div>
                        <Card className="shadow-none">
                          <CardContent className="p-3.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">{item.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                              </div>
                              <Badge variant="outline" className="shrink-0 text-[10px]">
                                {formatTime(item.date)}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </section>
            )
        )
      )}
    </div>
  );
}
