"use client";

import React from "react";
import { ManagerEvaluationForm } from "../_components/manager-evaluation-form";
import { FeedbackCollector360 } from "../_components/360-feedback-collector";
import { DevelopmentPlanEditor } from "../_components/development-plan-editor";

export default function ManagerEvaluationPage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manager & HOD Evaluation Workspace</h1>
        <p className="text-muted-foreground text-sm">
          Review subordinate self-assessments, enter manager ratings, aggregate 360 feedback, and draft development plans.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ManagerEvaluationForm />
        </div>
        <div className="space-y-6">
          <FeedbackCollector360 />
          <DevelopmentPlanEditor />
        </div>
      </div>
    </div>
  );
}
