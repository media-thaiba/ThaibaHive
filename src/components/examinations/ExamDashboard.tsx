"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ExamStatCards } from "./ExamStatCards";
import { ExamQueue, ExamSessionItem } from "./ExamQueue";

interface ExamDashboardProps {
  onOpenSetupWizard?: () => void;
  onSelectAction?: (exam: ExamSessionItem, action: "view" | "hall_tickets" | "mark_entry" | "tabulation") => void;
}

export function ExamDashboard({ onOpenSetupWizard, onSelectAction }: ExamDashboardProps) {
  const [exams, setExams] = useState<ExamSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [metrics, setMetrics] = useState({
    totalExams: 0,
    scheduledCount: 0,
    hallTicketsIssued: 0,
    pendingEvaluations: 0,
    passRate: 0,
  });

  const fetchExams = useCallback(() => {
    setIsLoading(true);
    fetch("/api/examinations/exams")
      .then((res) => res.json())
      .then((data) => {
        if (data.exams) {
          const list: ExamSessionItem[] = data.exams;
          setExams(list);
          
          setMetrics({
            totalExams: list.length,
            scheduledCount: list.filter((e) => e.status === "scheduled").length,
            hallTicketsIssued: 1420, // Sample active metric
            pendingEvaluations: list.filter((e) => e.status === "evaluation").length,
            passRate: 88.5,
          });
        }
      })
      .catch((err) => {
        console.error("Failed to fetch exams", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Examination Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage exam sessions, hall ticket issuance, mark entry, and report card publishing across campuses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onOpenSetupWizard}>
            + Create New Exam Session
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <ExamStatCards metrics={metrics} isLoading={isLoading} />

      {/* Main Queue View */}
      <ExamQueue
        exams={exams}
        isLoading={isLoading}
        activeStatusTab={activeTab}
        onStatusTabChange={setActiveTab}
        onSelectExam={(exam, action) => {
          if (onSelectAction) {
            onSelectAction(exam, action);
          }
        }}
      />
    </div>
  );
}
