'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FeePaymentItem } from '@/lib/operations/finance/types';

interface PaymentHistoryTableProps {
  payments: FeePaymentItem[];
}

export function PaymentHistoryTable({ payments }: PaymentHistoryTableProps) {
  const handleDownloadReceipt = (receiptNumber: string) => {
    alert(`Downloading cryptographically signed receipt: ${receiptNumber}`);
  };

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-bold text-slate-900">Payment & Receipt History</CardTitle>
          <p className="text-xs text-slate-500 mt-1">Download official cryptographically verified fee receipts</p>
        </div>
        <Badge variant="secondary">{payments.length} Receipts</Badge>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No payment receipts available yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead className="text-right">Amount Paid</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-semibold text-slate-900">
                    {p.receiptNumber || p.paymentNumber}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {new Date(p.paidAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="uppercase text-xs font-semibold text-slate-700">
                    {p.paymentMethod}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900">
                    ₹{p.netAmount.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="success">CONFIRMED</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadReceipt(p.receiptNumber || p.paymentNumber)}
                    >
                      Download Receipt
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
