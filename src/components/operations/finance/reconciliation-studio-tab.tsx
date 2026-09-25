'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { FeeReconciliationBatchItem } from '@/lib/operations/finance/types';

interface ReconciliationStudioTabProps {
  batches: FeeReconciliationBatchItem[];
}

export function ReconciliationStudioTab({ batches }: ReconciliationStudioTabProps) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-bold text-slate-900">Bank Statement & Gateway Settlement Reconciliation</CardTitle>
          <p className="text-xs text-slate-500 mt-1">Automated 3-way matching and discrepancy resolution batches</p>
        </div>
        <Badge variant="info" className="px-3 py-1">
          {batches.length} Batches Processed
        </Badge>
      </CardHeader>
      <CardContent>
        {batches.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No reconciliation batches uploaded yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch #</TableHead>
                <TableHead>Source Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Matched / Total</TableHead>
                <TableHead className="text-right">Settled Total</TableHead>
                <TableHead className="text-right">Discrepancy</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs font-semibold text-slate-900">
                    {b.batchNumber}
                  </TableCell>
                  <TableCell className="uppercase text-xs font-semibold text-slate-700">
                    {b.sourceType.replace('_', ' ')}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{b.statementDate}</TableCell>
                  <TableCell className="text-center text-xs font-semibold">
                    <span className="text-emerald-600">{b.matchedTransactions}</span> / {b.totalTransactions}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900">
                    ₹{b.totalSettledAmount.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${b.discrepancyAmount === 0 ? 'text-slate-500' : 'text-rose-600'}`}>
                    {b.discrepancyAmount === 0 ? '₹0' : `₹${b.discrepancyAmount.toLocaleString('en-IN')}`}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={b.status === 'reconciled' ? 'success' : 'destructive'}>
                      {b.status.toUpperCase()}
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
