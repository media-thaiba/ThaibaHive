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
      const res = await fetch(
        `/api/finance/fees/allocations?studentId=${encodeURIComponent(studentId)}`
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch student fee details');
      }

      const allocs = ensureArray(data?.allocations);
      setAllocation(allocs.length > 0 ? (allocs[0] as FeeStudentAllocationItem) : null);

      // Real payment history — a failed history fetch must not fabricate rows.
      const payRes = await fetch(
        `/api/finance/fees/receipts?studentId=${encodeURIComponent(studentId)}`
      );
      const payData = await payRes.json().catch(() => null);
      if (!payRes.ok) {
        throw new Error(payData?.error || 'Failed to fetch payment history');
      }
      setPaymentHistory(ensureArray(payData?.payments));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch student fee details');
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
