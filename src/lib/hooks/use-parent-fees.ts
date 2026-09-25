'use client';

import { useState, useEffect, useCallback } from 'react';
import { FeeStudentAllocationItem, FeePaymentItem } from '@/lib/operations/finance/types';
import { ensureArray } from '@/lib/utils';

export function useParentFees(studentId: string = 'stud-101') {
  const [allocation, setAllocation] = useState<FeeStudentAllocationItem | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<FeePaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentFees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/finance/fees/allocations?studentId=${studentId}`)
        .then((r) => r.json())
        .catch(() => ({ allocations: [] }));

      const allocs = ensureArray(res.allocations);
      if (allocs.length > 0) {
        setAllocation(allocs[0] as FeeStudentAllocationItem);
      } else {
        // Fallback default allocation
        setAllocation({
          id: 'alloc-demo',
          institutionId: 'inst-001',
          studentId,
          feeStructureId: 'struct-btech-2026',
          academicYear: '2026-2027',
          baseAmount: 120000,
          concessionAmount: 20000,
          netPayableAmount: 100000,
          paidAmount: 50000,
          balanceAmount: 50000,
          status: 'partial',
          allocationDate: '2026-06-01',
          dueDate: '2026-09-15',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          installments: [
            {
              id: 'inst-1',
              allocationId: 'alloc-demo',
              installmentNumber: 1,
              title: 'Semester 1 Fee',
              dueDate: '2026-08-15',
              gracePeriodDays: 7,
              amount: 50000,
              paidAmount: 50000,
              balanceAmount: 0,
              fineAmount: 0,
              fineWaivedAmount: 0,
              status: 'paid',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'inst-2',
              allocationId: 'alloc-demo',
              installmentNumber: 2,
              title: 'Semester 2 Fee',
              dueDate: '2027-01-15',
              gracePeriodDays: 7,
              amount: 50000,
              paidAmount: 0,
              balanceAmount: 50000,
              fineAmount: 0,
              fineWaivedAmount: 0,
              status: 'pending',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        });
      }

      setPaymentHistory([
        {
          id: 'pay-sample-1',
          paymentNumber: 'PAY-2026-0842',
          institutionId: 'inst-001',
          allocationId: 'alloc-demo',
          studentId,
          amount: 50000,
          fineAmount: 0,
          discountAmount: 0,
          netAmount: 50000,
          currency: 'INR',
          paymentMethod: 'upi',
          paymentStatus: 'completed',
          receiptNumber: 'RCPT-2026-0842',
          paidAt: '2026-08-10T09:30:00.000Z',
          createdAt: '2026-08-10T09:30:00.000Z',
          updatedAt: '2026-08-10T09:30:00.000Z',
        },
      ]);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch student fee details');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchStudentFees().catch(() => setLoading(false));
  }, [fetchStudentFees]);

  return {
    allocation,
    paymentHistory,
    loading,
    error,
    refresh: fetchStudentFees,
  };
}
