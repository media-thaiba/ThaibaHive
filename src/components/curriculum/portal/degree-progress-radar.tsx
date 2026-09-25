'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface DegreeProgressRadarProps {
  earnedCredits?: number;
  totalCredits?: number;
  cumulativeGpa?: number;
  completionPercentage?: number;
}

export const DegreeProgressRadar: React.FC<DegreeProgressRadarProps> = ({
  earnedCredits = 64,
  totalCredits = 120,
  cumulativeGpa = 3.42,
  completionPercentage = 53.3,
}) => {
  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span>Degree Progress & Graduation Velocity</span>
          <Badge variant="success">On Track for Spring 2030</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total Degree Completion</span>
            <span className="font-bold text-foreground">{completionPercentage}% ({earnedCredits}/{totalCredits} Credits)</span>
          </div>
          <Progress value={completionPercentage} className="h-2.5" />
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
          <div className="p-2.5 bg-muted/40 rounded-lg">
            <p className="text-muted-foreground">Cumulative GPA</p>
            <p className="text-base font-bold text-foreground mt-0.5">{cumulativeGpa.toFixed(2)}</p>
          </div>
          <div className="p-2.5 bg-muted/40 rounded-lg">
            <p className="text-muted-foreground">Remaining Credits</p>
            <p className="text-base font-bold text-primary mt-0.5">{totalCredits - earnedCredits}</p>
          </div>
          <div className="p-2.5 bg-muted/40 rounded-lg">
            <p className="text-muted-foreground">Terms Remaining</p>
            <p className="text-base font-bold text-foreground mt-0.5">4 Terms</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
