"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Percent, RefreshCw } from "lucide-react";

const allCategories = [
  "Tuition Fees", "Grants & Donations", "Canteen Sales", "Event Revenue", "Other Revenue",
  "Salaries & Wages", "Maintenance & Repairs", "Canteen Purchase", "Utilities", "Teaching Supplies", "Others",
];

type Props = {
  taxRatePercent: string;
  taxCategoryOverrides: Record<string, number>;
  transactions: { category: string }[];
  onRateChange: (v: string) => void;
  onOverrideChange: (category: string, rate: number) => void;
  onResetOverrides: () => void;
  taxCalcs: {
    calculatedTaxOnIncome: number;
    calculatedTaxOnExpense: number;
    netTaxLiability: number;
  };
};

export function AccountsTaxPanel({ taxRatePercent, taxCategoryOverrides, transactions, onRateChange, onOverrideChange, onResetOverrides, taxCalcs }: Props) {
  return (
    <Card className="animate-slide-up">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
        <CardTitle className="text-base font-semibold">Tax rate override</CardTitle>
        <Percent className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">Base GST/Tax Rate (%)</label>
          <div className="flex gap-2">
            <Input type="number" min="0" max="100" value={taxRatePercent} onChange={(e) => onRateChange(e.target.value)} />
            <Button variant="outline" size="sm" onClick={onResetOverrides} title="Reset category overrides">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t">
          <h4 className="text-xs font-semibold text-muted-foreground">GST Category Overrides</h4>
          <div className="space-y-2 text-xs">
            {allCategories.map(cat => {
              const currentOverride = taxCategoryOverrides[cat];
              const hasTx = transactions.some(t => t.category === cat);
              if (!hasTx) return null;
              return (
                <div key={cat} className="flex justify-between items-center gap-2">
                  <span className="truncate flex-1 font-medium">{cat}</span>
                  <Select
                    className="h-7 py-0 w-24 text-[11px]"
                    value={currentOverride !== undefined ? currentOverride.toString() : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        const copy = { ...taxCategoryOverrides };
                        delete copy[cat];
                        onOverrideChange(cat, -1);
                      } else {
                        onOverrideChange(cat, parseFloat(val));
                      }
                    }}
                  >
                    <option value="">Default ({taxRatePercent}%)</option>
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                    <option value="28">28% GST</option>
                  </Select>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2.5 pt-4 border-t text-xs">
          <h4 className="font-semibold text-muted-foreground">Calculation Summary</h4>
          <div className="flex justify-between text-muted-foreground">
            <span>Calculated Tax on Income:</span>
            <span className="font-semibold text-success">₹{taxCalcs.calculatedTaxOnIncome.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Calculated Tax on Expenses:</span>
            <span className="font-semibold text-destructive">₹{taxCalcs.calculatedTaxOnExpense.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between font-bold border-t pt-2 text-foreground">
            <span>Net Estimated GST Liability:</span>
            <span className={taxCalcs.netTaxLiability >= 0 ? "text-success" : "text-destructive"}>
              ₹{taxCalcs.netTaxLiability.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground italic pt-2">
            *Estimated net tax liability calculated as Tax collected on Income minus Input Tax Credit on Expenses.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
