"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageSquare, Shield, Inbox } from "lucide-react";
import { formatDate } from "@/lib/utils";

export type Grievance = {
  id: string;
  staffId: string | null;
  isAnonymous: boolean;
  category: string;
  subject: string;
  description: string;
  status: string;
  response: string | null;
  respondedById: string | null;
  responderName: string | null;
  responderLastName: string | null;
  respondedAt: string | null;
  submitterName: string | null;
  createdAt: string;
  updatedAt: string;
};

export const STATUS_VARIANT: Record<
  string,
  "info" | "warning" | "success" | "secondary" | "destructive"
> = {
  open: "info",
  in_review: "warning",
  resolved: "success",
  dismissed: "secondary",
};

export const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_review: "In Review",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export const CATEGORIES = [
  { value: "workplace", label: "Workplace" },
  { value: "harassment", label: "Harassment" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "payroll", label: "Payroll / Compensation" },
  { value: "management", label: "Management" },
  { value: "general", label: "General" },
];

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);

export const CATEGORY_VARIANT: Record<
  string,
  "default" | "secondary" | "info" | "warning" | "destructive" | "success"
> = {
  workplace: "default",
  harassment: "destructive",
  infrastructure: "warning",
  payroll: "info",
  management: "secondary",
  general: "default",
};

export type FilterTab = "all" | "mine" | "open" | "resolved";

interface GrievanceListProps {
  grievances: Grievance[];
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  totalCount: number;
  myCount: number;
  openCount: number;
  resolvedCount: number;
  onSelectGrievance: (g: Grievance) => void;
}

export function GrievanceList({
  grievances,
  activeTab,
  onTabChange,
  totalCount,
  myCount,
  openCount,
  resolvedCount,
  onSelectGrievance,
}: GrievanceListProps) {
  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: totalCount },
    { key: "mine", label: "My Submissions", count: myCount },
    { key: "open", label: "Open", count: openCount },
    { key: "resolved", label: "Resolved", count: resolvedCount },
  ];

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-muted-foreground">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Grievance List */}
      <div className="space-y-3">
        {grievances.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-12 w-12" />}
            title="No grievances found"
            description="No submissions match the selected filter. Submit a new grievance to get started."
          />
        ) : (
          grievances.map((g) => (
            <Card
              key={g.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelectGrievance(g)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={CATEGORY_VARIANT[g.category] || "default"}>
                        {CATEGORY_LABELS[g.category] || g.category}
                      </Badge>
                      <Badge variant={STATUS_VARIANT[g.status] || "secondary"}>
                        {STATUS_LABELS[g.status] || g.status}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-1">{g.subject}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{g.description}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t pt-2 mt-3">
                  <span className="flex items-center gap-1">
                    {g.isAnonymous ? (
                      <>
                        <Shield className="h-3 w-3" /> Anonymous
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-3 w-3" /> {g.submitterName || "Staff Member"}
                      </>
                    )}
                  </span>
                  <span>{formatDate(g.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
