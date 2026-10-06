"use client";

import React from "react";
import { SelfAssessmentForm } from "./_components/self-assessment-form";
import { GoalTracker } from "./_components/goal-tracker";
import { ReviewHistory } from "./_components/review-history";

export default function StaffPerformancePortalPage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff Self-Service Performance Portal</h1>
        <p className="text-muted-foreground text-sm">
          Submit quarterly self-assessments, manage development goals, and view appraisal records.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SelfAssessmentForm reviewId="active_review" />
          <ReviewHistory />
        </div>
        <div>
          <GoalTracker />
        </div>
      </div>
    </div>
  );
}
