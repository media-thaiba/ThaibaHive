'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface CreditMeterProps {
  credits: number;
}

export const CreditMeter: React.FC<CreditMeterProps> = ({ credits }) => {
  let badgeVariant: 'secondary' | 'success' | 'warning' | 'destructive' = 'success';
  let label = 'Optimal';

  if (credits < 12) {
    badgeVariant = 'warning';
    label = 'Underload (<12 cr)';
  } else if (credits > 18) {
    badgeVariant = 'destructive';
    label = 'Overload (>18 cr)';
  }

  return (
    <div className="flex items-center justify-between text-xs pt-2 border-t">
      <span className="font-semibold text-foreground">{credits} Credits</span>
      <Badge variant={badgeVariant} className="text-[10px]">
        {label}
      </Badge>
    </div>
  );
};
