'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NeuroBillingLedgerTransactionItem, NeuroComputeBillingAccountItem } from '@/lib/operations/neuro/neuro-types';

interface GrantLedgerTableProps {
  accounts: NeuroComputeBillingAccountItem[];
  transactions: NeuroBillingLedgerTransactionItem[];
}

export const GrantLedgerTable: React.FC<GrantLedgerTableProps> = ({
  accounts,
  transactions,
}) => {
  return (
    <div className="space-y-4">
      <Card className="border border-border/60 bg-card/90 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Research Grant Compute Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.map((acc) => {
              const util = acc.tokenAllocatedTotal > 0 ? (acc.tokenSpentTotal / acc.tokenAllocatedTotal) * 100 : 0;
              return (
                <div key={acc.id} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-foreground">{acc.accountNumber}</span>
                    <Badge variant={acc.isHardCapLocked ? 'destructive' : acc.status === 'warning' ? 'warning' : 'success'}>
                      {acc.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{acc.grantTitle || acc.grantId || 'General Department Allocation'}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Tokens Remaining:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{acc.tokenBalance.toFixed(1)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full ${util >= 100 ? 'bg-destructive' : util >= 80 ? 'bg-amber-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min(100, util)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Spent: {acc.tokenSpentTotal.toFixed(1)}</span>
                      <span>Cap: {acc.hardCapTokens.toFixed(1)} ({util.toFixed(0)}%)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-card/90 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Double-Entry Compute Ledger Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-2 px-3 font-medium">Tx ID</th>
                  <th className="py-2 px-3 font-medium">Type</th>
                  <th className="py-2 px-3 font-medium">Tokens</th>
                  <th className="py-2 px-3 font-medium">Debit Code</th>
                  <th className="py-2 px-3 font-medium">Credit Code</th>
                  <th className="py-2 px-3 font-medium">Balance After</th>
                  <th className="py-2 px-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-foreground">{tx.transactionId}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                        {tx.transactionType}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-rose-600 dark:text-rose-400">
                      -{tx.tokensAmount.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{tx.debitAccountCode}</td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{tx.creditAccountCode}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-foreground">{tx.balanceAfterTokens.toFixed(1)}</td>
                    <td className="py-2.5 px-3 text-muted-foreground truncate max-w-xs">{tx.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
