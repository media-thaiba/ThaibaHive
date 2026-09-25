'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RoadmapDiffCardProps {
  action: {
    actionType: string;
    courseCode?: string;
    targetTerm?: number;
    reason: string;
  };
  onApply?: () => void;
}

export const RoadmapDiffCard: React.FC<RoadmapDiffCardProps> = ({
  action,
  onApply,
}) => {
  return (
    <Card className="border-primary/40 bg-primary/5 my-2">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="default" className="text-xs">
            Proposed Roadmap Action: {action.actionType.replace('_', ' ')}
          </Badge>
          {onApply && (
            <Button size="sm" variant="default" onClick={onApply} className="h-7 text-xs">
              Apply to My Plan
            </Button>
          )}
        </div>
        <p className="text-xs font-semibold text-foreground">
          {action.courseCode ? `Course: ${action.courseCode}` : ''} {action.targetTerm ? `(Term ${action.targetTerm})` : ''}
        </p>
        <p className="text-xs text-muted-foreground">{action.reason}</p>
      </CardContent>
    </Card>
  );
};
