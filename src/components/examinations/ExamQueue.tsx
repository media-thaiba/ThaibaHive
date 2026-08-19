"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export interface ExamSessionItem {
  id: string;
  title: string;
  academicYear: string;
  term: string;
  startDate: string;
  endDate: string;
  status: "draft" | "scheduled" | "ongoing" | "evaluation" | "published";
  createdAt: string;
}

interface ExamQueueProps {
  exams: ExamSessionItem[];
  isLoading: boolean;
  activeStatusTab: string;
  onStatusTabChange: (status: string) => void;
  onSelectExam: (exam: ExamSessionItem, action: "view" | "hall_tickets" | "mark_entry" | "tabulation") => void;
}

export function ExamQueue({
  exams,
  isLoading,
  activeStatusTab,
  onStatusTabChange,
  onSelectExam,
}: ExamQueueProps) {
  const tabs = [
    { key: "all", label: "All Sessions" },
    { key: "draft", label: "Draft" },
    { key: "scheduled", label: "Scheduled" },
    { key: "ongoing", label: "Ongoing" },
    { key: "evaluation", label: "Evaluation" },
    { key: "published", label: "Published" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge variant="success">Published</Badge>;
      case "ongoing":
        return <Badge variant="warning">Ongoing</Badge>;
      case "evaluation":
        return <Badge variant="info">Evaluation</Badge>;
      case "scheduled":
        return <Badge variant="secondary">Scheduled</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const filteredExams = activeStatusTab === "all"
    ? exams
    : exams.filter((e) => e.status === activeStatusTab);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <Skeleton key={t.key} className="h-9 w-24" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map((t) => {
          const count = t.key === "all" ? exams.length : exams.filter((e) => e.status === t.key).length;
          const isActive = activeStatusTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onStatusTabChange(t.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {t.label}
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Exam Items Table */}
      {filteredExams.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          No examination sessions found in &quot;{activeStatusTab}&quot; status.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Examination Session</th>
                <th className="px-4 py-3">Academic Term</th>
                <th className="px-4 py-3">Schedule Window</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredExams.map((exam) => (
                <tr key={exam.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <div>{exam.title}</div>
                    <div className="text-xs text-muted-foreground font-normal">ID: {exam.id}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {exam.academicYear} ({exam.term})
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {exam.startDate} to {exam.endDate}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(exam.status)}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Button variant="outline" size="sm" onClick={() => onSelectExam(exam, "view")}>
                      Details
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onSelectExam(exam, "hall_tickets")}>
                      Hall Tickets
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onSelectExam(exam, "mark_entry")}>
                      Mark Entry
                    </Button>
                    <Button variant="default" size="sm" onClick={() => onSelectExam(exam, "tabulation")}>
                      Tabulation
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
