'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DegreeAuditResult } from '@/lib/operations/km/km-types';
import { GraduationCap, CheckCircle2, AlertCircle } from 'lucide-react';

export function DegreeProgressCard({ audit }: { audit: DegreeAuditResult }) {
  return (
    <Card className="w-full border shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-base font-semibold">Degree Progress: {audit.programCode}</CardTitle>
          </div>
          <Badge variant={audit.isGraduationEligible ? 'success' : 'secondary'}>
            {audit.isGraduationEligible ? 'Graduation Ready' : 'In Progress'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium">
            <span>Overall Credits: {audit.totalCompletedCredits} / {audit.totalRequiredCredits} hrs</span>
            <span>{audit.completionPercentage}%</span>
          </div>
          <Progress value={audit.completionPercentage} className="h-2.5" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-slate-50 border rounded text-slate-700">
            <span className="text-slate-400 block">Cumulative GPA</span>
            <span className="font-semibold text-sm">{audit.cumulativeGpa}</span>
          </div>
          <div className="p-2 bg-slate-50 border rounded text-slate-700">
            <span className="text-slate-400 block">Major GPA</span>
            <span className="font-semibold text-sm">{audit.majorGpa}</span>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <span className="text-xs font-semibold text-slate-700 block">Requirement Breakdown:</span>
          {audit.requirementsSummary.map((req, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs p-2 bg-white border rounded">
              <div className="flex items-center gap-1.5">
                {req.isSatisfied ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                )}
                <span className="font-medium text-slate-800">{req.category}</span>
              </div>
              <span className="text-slate-500">{req.fulfilledCredits} / {req.requiredCredits} cr</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
