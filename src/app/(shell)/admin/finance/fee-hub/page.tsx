'use client';

import React from 'react';
import { useFeeHub } from '@/lib/hooks/use-fee-hub';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FeeStructureTab } from '@/components/operations/finance/fee-structure-tab';
import { CollectionLedgerTab } from '@/components/operations/finance/collection-ledger-tab';
import { CounterRegisterTab } from '@/components/operations/finance/counter-register-tab';
import { AgingDefaulterTab } from '@/components/operations/finance/aging-defaulter-tab';
import { ReconciliationStudioTab } from '@/components/operations/finance/reconciliation-studio-tab';

export default function FeeHubPage() {
  const { structures, payments, registers, batches, agingSummary, loading, error, refresh } = useFeeHub();

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
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
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            FinanceOS & Centralized Fee Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Centralized fee collection, multi-gateway reconciliation, counter shifts, and aging accounts receivable mesh
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refresh()}>
            Refresh Live Ledger
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      <Tabs defaultValue="structures" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
          <TabsTrigger value="ledger">Collection Ledger</TabsTrigger>
          <TabsTrigger value="counter">Counter & Shifts</TabsTrigger>
          <TabsTrigger value="aging">Aging & Defaulters</TabsTrigger>
          <TabsTrigger value="reconcile">Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="structures">
          <FeeStructureTab structures={structures} />
        </TabsContent>

        <TabsContent value="ledger">
          <CollectionLedgerTab payments={payments} />
        </TabsContent>

        <TabsContent value="counter">
          <CounterRegisterTab registers={registers} />
        </TabsContent>

        <TabsContent value="aging">
          <AgingDefaulterTab summary={agingSummary} />
        </TabsContent>

        <TabsContent value="reconcile">
          <ReconciliationStudioTab batches={batches} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
