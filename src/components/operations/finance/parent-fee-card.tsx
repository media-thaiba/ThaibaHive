'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FeeStudentAllocationItem } from '@/lib/operations/finance/types';

interface ParentFeeCardProps {
  allocation: FeeStudentAllocationItem;
  onPayClick: (amount: number, installmentId?: string) => void;
}

export function ParentFeeCard({ allocation, onPayClick }: ParentFeeCardProps) {
  const installments = allocation.installments || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm p-4">
          <div className="text-xs text-slate-500 font-medium">Annual Gross Fee</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">₹{allocation.baseAmount.toLocaleString('en-IN')}</div>
        </Card>
        <Card className="border border-slate-200 shadow-sm p-4">
          <div className="text-xs text-slate-500 font-medium">Approved Scholarship</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">₹{allocation.concessionAmount.toLocaleString('en-IN')}</div>
        </Card>
        <Card className="border border-slate-200 shadow-sm p-4">
          <div className="text-xs text-slate-500 font-medium">Total Amount Paid</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">₹{allocation.paidAmount.toLocaleString('en-IN')}</div>
        </Card>
        <Card className="border border-slate-200 shadow-sm p-4">
          <div className="text-xs text-slate-500 font-medium">Outstanding Balance</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">₹{allocation.balanceAmount.toLocaleString('en-IN')}</div>
        </Card>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">Installment Schedule ({allocation.academicYear})</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Select and clear upcoming installments or pay customized amounts</p>
          </div>
          <Badge variant={allocation.balanceAmount === 0 ? 'success' : 'warning'}>
            {allocation.status.toUpperCase()}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {installments.map((inst) => {
            const isPaid = inst.status === 'paid' || inst.balanceAmount === 0;
            return (
              <div
                key={inst.id}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white transition-colors"
              >
                <div>
                  <div className="font-semibold text-slate-900">{inst.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Due Date: {inst.dueDate} • Grace Period: {inst.gracePeriodDays} Days
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-slate-900">₹{inst.amount.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-slate-500">
                      {isPaid ? 'Paid' : `Balance: ₹${inst.balanceAmount.toLocaleString('en-IN')}`}
                    </div>
                  </div>
                  {isPaid ? (
                    <Badge variant="success" className="px-3 py-1.5">PAID</Badge>
                  ) : (
                    <Button onClick={() => onPayClick(inst.balanceAmount, inst.id)}>
                      Pay Installment
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
