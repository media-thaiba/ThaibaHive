"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FileSpreadsheet, Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";

type DailyReport = {
  id: string;
  staffId: string;
  date: string;
  summary: string | null;
  status: string;
  reviewerComment: string | null;
  firstName?: string;
  lastName?: string;
  createdAt: string;
};

const statusStyles: Record<string, "secondary" | "warning" | "success" | "destructive"> = {
  draft: "secondary",
  submitted: "warning",
  reviewed: "success",
  rejected: "destructive",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Awaiting Review",
  reviewed: "Reviewed",
  rejected: "Rejected",
};

type Props = {
  reports: DailyReport[];
  activeTab: "my" | "team";
  staffId?: string;
  onViewReport: (report: DailyReport) => void;
  onEditReport: (report: DailyReport) => void;
};

export function ReportList({ reports, activeTab, staffId, onViewReport, onEditReport }: Props) {
  const displayList = activeTab === "my"
    ? reports.filter(r => r.staffId === staffId)
    : reports.filter(r => r.staffId !== staffId);

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          {activeTab === "my" ? "Personal Log History" : "Team Activity Logs"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayList.length === 0 ? (
          <EmptyState
            icon={<FileSpreadsheet className="h-12 w-12" />}
            title="No daily reports logged"
            description={
              activeTab === "my"
                ? "Log your accomplishments and hours spent to keep your team aligned."
                : "No team activity logs are waiting for review."
            }
          />
        ) : (
          <div className="space-y-4">
            {displayList.map((rep) => (
              <div
                key={rep.id}
                className="flex flex-col gap-4 rounded-xl border p-4 hover:bg-muted/20 transition-colors md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      Log for: {formatDate(rep.date)}
                    </span>
                    <Badge variant={statusStyles[rep.status] || "secondary"} className="capitalize text-[10px] py-0">
                      {statusLabels[rep.status] || rep.status}
                    </Badge>
                  </div>
                  {rep.summary && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {rep.summary}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {activeTab === "team" && (rep.firstName || rep.lastName) && (
                      <span>Submitted by: <strong>{rep.firstName} {rep.lastName}</strong></span>
                    )}
                    <span>Logged on: {formatDate(rep.createdAt)}</span>
                  </div>
                  {rep.reviewerComment && (
                    <div className="mt-2 rounded-lg bg-muted/60 p-2.5 text-xs border border-border/40">
                      <span className="font-semibold text-muted-foreground">Reviewer Comment: </span>
                      <span>{rep.reviewerComment}</span>
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                  <Button variant="outline" size="sm" onClick={() => onViewReport(rep)} className="gap-1 text-xs">
                    <Eye className="h-3.5 w-3.5" /> View Log
                  </Button>
                  {activeTab === "my" && ["draft", "rejected"].includes(rep.status) && (
                    <Button variant="secondary" size="sm" onClick={() => onEditReport(rep)} className="text-xs">
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
