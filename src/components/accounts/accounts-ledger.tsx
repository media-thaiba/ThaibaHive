"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Transaction = {
  id: string;
  institutionName: string | null;
  type: string;
  category: string;
  amount: number;
  description: string | null;
  transactionDate: string;
  recordedByName: string | null;
  recordedByLastName: string | null;
};

type Props = {
  transactions: Transaction[];
  isWriter: boolean;
  onDelete: (id: string) => void;
};

export function AccountsLedger({ transactions, isWriter, onDelete }: Props) {
  return (
    <Card className="lg:col-span-2 animate-slide-up">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Transaction Ledger</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No transactions logged"
            description="Use the record button above to add new income or expenses."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th scope="col" className="p-3">Date</th>
                  <th scope="col" className="p-3">Institution</th>
                  <th scope="col" className="p-3">Category</th>
                  <th scope="col" className="p-3">Type</th>
                  <th scope="col" className="p-3 text-right">Amount</th>
                  <th scope="col" className="p-3">By</th>
                  {isWriter && <th scope="col" className="p-3 text-center">Action</th>}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                    <td className="p-3 font-medium whitespace-nowrap">{formatDate(tx.transactionDate)}</td>
                    <td className="p-3 font-medium text-muted-foreground">{tx.institutionName || "\u2014"}</td>
                    <td className="p-3">
                      <div className="font-semibold">{tx.category}</div>
                      {tx.description && <div className="text-[10px] text-muted-foreground line-clamp-1">{tx.description}</div>}
                    </td>
                    <td className="p-3">
                      <Badge variant={tx.type === "income" ? "success" : "destructive"} className="text-[9px] px-1.5 py-0 uppercase">
                        {tx.type}
                      </Badge>
                    </td>
                    <td className={`p-3 text-right font-bold ${tx.type === "income" ? "text-success" : "text-destructive"}`}>
                      ₹{tx.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {tx.recordedByName ? `${tx.recordedByName} ${tx.recordedByLastName?.charAt(0)}.` : "\u2014"}
                    </td>
                    {isWriter && (
                      <td className="p-3 text-center">
                        <Button variant="ghost" size="icon-xs" onClick={() => onDelete(tx.id)} className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
