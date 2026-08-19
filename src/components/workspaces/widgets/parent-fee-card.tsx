'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';

interface ParentFeeData {
  pendingFeeTotal?: number;
  invoiceCount?: number;
  currency?: string;
}

export function ParentFeeCard({ data }: { data?: ParentFeeData }) {
  const total = data?.pendingFeeTotal ?? 0;
  const invoices = data?.invoiceCount ?? 0;

  return (
    <Card data-testid="widget-parent-fee-card" role="region" aria-label="School Fee Status">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">School Fees</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">₹{total.toLocaleString('en-IN')}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {invoices > 0 ? `${invoices} invoice${invoices > 1 ? 's' : ''} due` : 'No outstanding fees'}
        </p>
        {total > 0 && (
          <div className="mt-3">
            <Badge variant="warning">Payment required</Badge>
          </div>
        )}
        {total === 0 && (
          <div className="mt-3">
            <Badge variant="success">All fees paid</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
