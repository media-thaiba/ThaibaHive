'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { FeeCounterRegisterItem } from '@/lib/operations/finance/types';

interface CounterRegisterTabProps {
  registers: FeeCounterRegisterItem[];
}

export function CounterRegisterTab({ registers }: CounterRegisterTabProps) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-bold text-slate-900">Campus Cash Counter & Shift Register</CardTitle>
          <p className="text-xs text-slate-500 mt-1">Physical cashier shift balances, drawer floats, and supervisor handover verifications</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          {registers.length} Shifts Tracked
        </Badge>
      </CardHeader>
      <CardContent>
        {registers.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No cashier shift registers active today.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Counter / Cashier</TableHead>
                <TableHead>Opened At</TableHead>
                <TableHead className="text-right">Opening Float</TableHead>
                <TableHead className="text-right">Cash Collected</TableHead>
                <TableHead className="text-right">POS / Card</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registers.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-semibold text-slate-900">{r.counterName}</div>
                    <div className="text-xs text-slate-500">Cashier: {r.cashierId}</div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {new Date(r.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-700">
                    ₹{r.openingFloat.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-emerald-700">
                    ₹{r.systemCashTotal.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-blue-700">
                    ₹{r.systemPosTotal.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${r.varianceAmount === 0 ? 'text-slate-700' : 'text-rose-600'}`}>
                    {r.varianceAmount === 0 ? '₹0 (Balanced)' : `₹${r.varianceAmount.toLocaleString('en-IN')}`}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={r.status === 'open' ? 'warning' : 'success'}>
                      {r.status.toUpperCase()}
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
