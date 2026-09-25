'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureArray } from '@/lib/utils';

interface RetentionMatrixTabProps {
  alerts?: any[];
  onTriageAlert?: (alertId: string) => void;
  loading?: boolean;
}

export const RetentionMatrixTab: React.FC<RetentionMatrixTabProps> = ({
  alerts = [],
  onTriageAlert,
  loading = false,
}) => {
  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const safeAlerts = ensureArray(alerts);

  const getRiskBadge = (tier: string) => {
    switch (tier) {
      case 'critical': return <Badge variant="destructive">Critical Risk</Badge>;
      case 'high': return <Badge variant="destructive">High Risk</Badge>;
      case 'medium': return <Badge variant="warning">Medium Risk</Badge>;
      default: return <Badge variant="success">Low Risk</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Student Retention Early Warning Matrix</span>
            <Badge variant="outline">{safeAlerts.length} Active Alerts</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {safeAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No outstanding retention alerts. All active cohorts are progressing normally.
            </p>
          ) : (
            <div className="divide-y text-sm">
              {safeAlerts.map((alert: any) => (
                <div key={alert.alertId} className="py-3 flex items-center justify-between">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">Student: {alert.studentId}</span>
                      {getRiskBadge(alert.riskTier)}
                      <span className="text-xs text-muted-foreground">Score: {alert.riskScore}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {alert.contributingFactorsJson}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={alert.status === 'open' ? 'warning' : 'info'}>
                      {alert.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onTriageAlert && onTriageAlert(alert.alertId)}
                    >
                      Triage Intervention
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
