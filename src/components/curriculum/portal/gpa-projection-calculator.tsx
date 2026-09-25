'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface GpaProjectionCalculatorProps {
  currentGpa?: number;
  currentCredits?: number;
}

export const GpaProjectionCalculator: React.FC<GpaProjectionCalculatorProps> = ({
  currentGpa = 3.40,
  currentCredits = 60,
}) => {
  const [futureCredits, setFutureCredits] = useState('15');
  const [targetTermGpa, setTargetTermGpa] = useState('3.80');

  const fCred = parseFloat(futureCredits) || 0;
  const fGpa = parseFloat(targetTermGpa) || 0;

  const currentPoints = currentGpa * currentCredits;
  const futurePoints = fGpa * fCred;
  const totalCred = currentCredits + fCred;
  const projectedGpa = totalCred > 0 ? ((currentPoints + futurePoints) / totalCred).toFixed(2) : currentGpa.toFixed(2);

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span>What-If GPA Projection Simulator</span>
          <Badge variant="info">Target: {projectedGpa}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-muted-foreground block mb-1">Upcoming Term Credits</label>
            <Input
              type="number"
              value={futureCredits}
              onChange={(e) => setFutureCredits(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-muted-foreground block mb-1">Simulated Term GPA</label>
            <Input
              type="number"
              step="0.1"
              value={targetTermGpa}
              onChange={(e) => setTargetTermGpa(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="p-2.5 bg-muted/40 rounded-lg text-center text-xs">
          <span className="text-muted-foreground">Projected Cumulative GPA: </span>
          <span className="font-bold text-base text-foreground ml-1">{projectedGpa}</span>
        </div>
      </CardContent>
    </Card>
  );
};
