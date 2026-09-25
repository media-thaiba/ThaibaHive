'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SpotArbitragePanel } from '@/components/operations/neuro/spot-arbitrage-panel';
import { GrantLedgerTable } from '@/components/operations/neuro/grant-ledger-table';
import { CloudSpotQuote } from '@/lib/operations/neuro/cloud/cloud-types';
import { NeuroBillingLedgerTransactionItem, NeuroComputeBillingAccountItem } from '@/lib/operations/neuro/neuro-types';
import { ensureArray } from '@/lib/utils';

export default function ResearchBillingPage() {
  const [quotes, setQuotes] = useState<CloudSpotQuote[]>([]);
  const [accounts, setAccounts] = useState<NeuroComputeBillingAccountItem[]>([]);
  const [transactions, setTransactions] = useState<NeuroBillingLedgerTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setIsLoading(true);
    setError(null);

    Promise.all([
      fetch('/api/neuro/cloud/arbitrage').then((res) => res.json()),
      fetch('/api/neuro/billing').then((res) => res.json()),
    ])
      .then(([arbitrageData, billingData]) => {
        setQuotes(ensureArray(arbitrageData.quotes));
        setAccounts(ensureArray(billingData.accounts));
        setTransactions(ensureArray(billingData.transactions));
      })
      .catch((err) => {
        setError(err.message || 'Failed to load billing and spot arbitrage data');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Hybrid Cloud Spot Arbitrage & Research Grant Billing"
        description="Multi-Cloud Brokerage, Tokenized Compute Metering & NSF/NIH Double-Entry Accounting"
        actions={
          <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}>
            Refresh Financials
          </Button>
        }
      />

      {error && (
        <Alert variant="error">
          <p>{error}</p>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <SpotArbitragePanel quotes={quotes} />
          <GrantLedgerTable accounts={accounts} transactions={transactions} />
        </div>
      )}
    </div>
  );
}
