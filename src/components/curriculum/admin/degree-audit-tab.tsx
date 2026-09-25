'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureArray } from '@/lib/utils';

interface DegreeAuditTabProps {
  auditReport?: any;
  loading?: boolean;
}

export const DegreeAuditTab: React.FC<DegreeAuditTabProps> = ({
  auditReport,
  loading = false,
}) => {
  if (loading) {
    return <Skeleton className="h-72 w-full" />;
  }

  if (!auditReport) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Select a student and degree program to execute a deterministic degree audit.
        </CardContent>
      </Card>
    );
  }

  const categories = ensureArray(auditReport.categories);
  const outstanding = ensureArray(auditReport.outstandingRequirements);

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <div>
              <span>Degree Audit: {auditReport.programTitle} ({auditReport.programCode})</span>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Catalog Year: {auditReport.catalogYear} · Student: {auditReport.studentId}
              </p>
            </div>
            <Badge variant={auditReport.isGraduationEligible ? 'success' : 'warning'}>
              {auditReport.isGraduationEligible ? 'Graduation Eligible' : `${auditReport.completionPercentage}% Complete`}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted/40 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Earned Credits</p>
              <p className="text-lg font-bold text-foreground">{auditReport.totalEarnedCredits} / {auditReport.totalRequiredCredits}</p>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">In Progress</p>
              <p className="text-lg font-bold text-primary">{auditReport.totalInProgressCredits} Credits</p>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Cumulative GPA</p>
              <p className="text-lg font-bold text-foreground">{auditReport.cumulativeGpa?.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Major GPA</p>
              <p className="text-lg font-bold text-foreground">{auditReport.majorGpa?.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirement Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat: any) => (
          <Card key={cat.categoryType}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-foreground">{cat.categoryTitle}</p>
                <Badge variant={cat.isSatisfied ? 'success' : 'destructive'}>
                  {cat.isSatisfied ? 'Fulfilled' : 'Incomplete'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 py-2 text-xs space-y-2">
              <p className="text-muted-foreground">
                Earned: {cat.earnedCredits} credits {cat.inProgressCredits > 0 ? `(+${cat.inProgressCredits} in-prog)` : ''} / {cat.requiredCredits} req
              </p>
              {cat.deficits && cat.deficits.length > 0 && (
                <div className="text-destructive font-medium">
                  {cat.deficits.map((d: string, idx: number) => (
                    <p key={idx}>• {d}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
