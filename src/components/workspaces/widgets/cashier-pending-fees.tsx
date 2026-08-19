'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

interface CashierPendingData {
  pendingInvoices?: number;
  pendingTotal?: number;
}

export function CashierPendingFees({ data }: { data?: CashierPendingData }) {
  const invoices = data?.pendingInvoices ?? 0;
  const total = data?.pendingTotal ?? 0;

  return (
    <Card data-testid="widget-cashier-pending-fees" role="region" aria-label="Pending Fees">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pending Fees</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{invoices}</div>
        <p className="text-xs text-muted-foreground mt-1">Overdue invoices</p>
        {total > 0 && (
          <div className="mt-3">
            <Badge variant="destructive">₹{total.toLocaleString('en-IN')} overdue</Badge>
          </div>
        )}
        {invoices === 0 && (
          <p className="text-xs text-muted-foreground mt-4">No pending fees.</p>
        )}
      </CardContent>
    </Card>
  );
}
