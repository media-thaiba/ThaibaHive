import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface EquipmentHealthGaugeProps {
  healthScore: number;
  equipmentName: string;
  assetTag: string;
  category: string;
  status: 'operational' | 'degraded' | 'offline' | 'maintenance';
}

export function EquipmentHealthGauge({
  healthScore,
  equipmentName,
  assetTag,
  category,
  status,
}: EquipmentHealthGaugeProps) {
  const getHealthVariant = (score: number): 'success' | 'warning' | 'destructive' | 'secondary' => {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'destructive';
  };

  const getStatusVariant = (st: string): 'success' | 'warning' | 'destructive' | 'secondary' => {
    if (st === 'operational') return 'success';
    if (st === 'degraded') return 'warning';
    if (st === 'offline') return 'destructive';
    return 'secondary';
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {assetTag} &bull; {category.toUpperCase()}
          </CardTitle>
          <div className="text-base font-semibold text-foreground mt-0.5">{equipmentName}</div>
        </div>
        <Badge variant={getStatusVariant(status)} className="capitalize">
          {status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Composite Health Index</span>
          <span className="text-xl font-bold font-mono">
            {healthScore.toFixed(1)}%
          </span>
        </div>
        <Progress value={healthScore} className="h-2.5" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Weibull Wear Hazard</span>
          <Badge variant={getHealthVariant(healthScore)}>
            {healthScore >= 80 ? 'Optimal Baseline' : healthScore >= 50 ? 'Accelerated Degradation' : 'Imminent Failure'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
