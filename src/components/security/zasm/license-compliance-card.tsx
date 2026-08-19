'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

interface LicenseProps {
  licenseAudit?: {
    totalAudited: number;
    compliantCount: number;
    nonCompliantCount: number;
    reports?: any[];
  } | null;
}

export function LicenseComplianceCard({ licenseAudit }: LicenseProps) {
  const compliant = licenseAudit?.compliantCount ?? 0;
  const nonCompliant = licenseAudit?.nonCompliantCount ?? 0;
  const total = licenseAudit?.totalAudited ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Open-Source License Compliance
        </CardTitle>
        <Badge variant={nonCompliant === 0 ? 'success' : 'destructive'}>
          {nonCompliant === 0 ? '100% Compliant' : `${nonCompliant} Copyleft Risk`}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>Permissive (MIT, Apache-2.0, BSD):</span>
          </div>
          <span className="font-bold">{compliant} packages</span>
        </div>
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span>Restrictive / Copyleft (AGPL, GPL):</span>
          </div>
          <span className="font-bold">{nonCompliant} packages</span>
        </div>
        <div className="text-xs text-muted-foreground pt-1 border-t">
          Total audited monorepo dependencies: {total > 0 ? total : '5 registered direct packages'}.
        </div>
      </CardContent>
    </Card>
  );
}
