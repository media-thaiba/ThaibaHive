'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { FeePaymentItem } from '@/lib/operations/finance/types';

interface CollectionLedgerTabProps {
  payments: FeePaymentItem[];
}

export function CollectionLedgerTab({ payments }: CollectionLedgerTabProps) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-bold text-slate-900">Real-Time Fee Collection & Payment Ledger</CardTitle>
          <p className="text-xs text-slate-500 mt-1">Multi-channel online and counter transaction ledger with gateway audit tokens</p>
        </div>
        <Badge variant="info" className="px-3 py-1">
          {payments.length} Transactions Recorded
        </Badge>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No payment transactions recorded yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment #</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Date / Time</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead className="text-right">Net Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-semibold text-slate-900">
                    {p.paymentNumber}
                  </TableCell>
                  <TableCell className="font-medium text-slate-700">{p.studentId}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {new Date(p.paidAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <span className="uppercase text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {p.paymentMethod}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900">
                    ₹{p.netAmount.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={p.paymentStatus === 'completed' ? 'success' : 'warning'}>
                      {p.paymentStatus.toUpperCase()}
                    </Badge>
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
