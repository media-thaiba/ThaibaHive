'use client';

import React, { useState } from 'react';
import { useParentFees } from '@/lib/hooks/use-parent-fees';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { ParentFeeCard } from '@/components/operations/finance/parent-fee-card';
import { PaymentHistoryTable } from '@/components/operations/finance/payment-history-table';
import { CheckoutModal } from '@/components/operations/finance/checkout-modal';

export default function ParentFeesPortalPage() {
  const { allocation, paymentHistory, loading, error, refresh } = useParentFees();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | undefined>();
  const [successReceipt, setSuccessReceipt] = useState<string | null>(null);

  const handlePayClick = (amount: number, installmentId?: string) => {
    setPayAmount(amount);
    setSelectedInstallmentId(installmentId);
    setCheckoutOpen(true);
  };

  const handlePaymentSuccess = (receiptNo: string) => {
    setSuccessReceipt(receiptNo);
    refresh();
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-5xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Student Fee & Online Payment Portal
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review outstanding dues, schedule installments, execute payments, and download certified receipts
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {successReceipt && (
        <Alert variant="success" className="bg-emerald-50 border-emerald-300 text-emerald-900">
          Payment successful! Your cryptographically signed receipt has been issued: <strong>{successReceipt}</strong>
        </Alert>
      )}

      {allocation && (
        <ParentFeeCard allocation={allocation} onPayClick={handlePayClick} />
      )}

      <PaymentHistoryTable payments={paymentHistory} />

      {allocation && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          allocationId={allocation.id}
          installmentId={selectedInstallmentId}
          amount={payAmount}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
