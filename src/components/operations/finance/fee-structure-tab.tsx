'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { FeeStructureItem } from '@/lib/operations/finance/types';

interface FeeStructureTabProps {
  structures: FeeStructureItem[];
}

export function FeeStructureTab({ structures }: FeeStructureTabProps) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-bold text-slate-900">Fee Structures & Component Matrix</CardTitle>
          <p className="text-xs text-slate-500 mt-1">Configured fee schedules across academic programs, quotas, and terms</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          {structures.length} Active Structures
        </Badge>
      </CardHeader>
      <CardContent>
        {structures.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No fee structures configured yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code / Name</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Quota / Type</TableHead>
                <TableHead>Components</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {structures.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-semibold text-slate-900">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.code}</div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-700">{s.academicYear}</TableCell>
                  <TableCell>
                    <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {s.quota} • {s.residentialType.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {s.components?.map((c) => c.name).join(', ') || 'Standard Components'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900">
                    ₹{s.totalAmount.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={s.isActive ? 'success' : 'secondary'}>
                      {s.isActive ? 'Active' : 'Archived'}
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
