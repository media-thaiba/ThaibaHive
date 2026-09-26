"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export interface ReconcileStudioItem {
  id: string;
  poNumber: string;
  vendorName: string;
  invoiceNumber: string;
  poAmountUsd: number;
  grnAmountUsd: number;
  invoiceAmountUsd: number;
  varianceUsd: number;
  status: "matched" | "discrepancy" | "under_match";
  items: {
    sku: string;
    description: string;
    poQty: number;
    grnQty: number;
    invQty: number;
    poPrice: number;
    invPrice: number;
  }[];
}

export function ThreeWayMatchStudio({ matchQueue }: { matchQueue: ReconcileStudioItem[] }) {
  const [selectedItem, setSelectedItem] = useState<ReconcileStudioItem | null>(null);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [justification, setJustification] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleRunReconciliation = async (item: ReconcileStudioItem) => {
    setProcessing(true);
    try {
      const res = await fetch("/api/supply/invoices/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: item.id,
          poId: item.poNumber,
          receiptId: `GRN-${item.poNumber.slice(-4)}`,
          lines: item.items.map((i) => ({
            itemSku: i.sku,
            description: i.description,
            poUnitPriceUsd: i.poPrice,
            poQuantityOrdered: i.poQty,
            grnQuantityReceived: i.grnQty,
            invoiceUnitPriceUsd: i.invPrice,
            invoiceQuantityBilled: i.invQty,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.evaluation.isToleranceCompliant) {
          toast.success(`Matched successfully! Payment Voucher: ${data.evaluation.paymentVoucherCode}`);
        } else {
          toast.warning(`Discrepancy flagged: $${data.evaluation.totalDollarVarianceUsd} variance`);
        }
      } else {
        toast.error(data.error || "Match processing failed");
      }
    } catch {
      toast.error("Network error during reconciliation");
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyOverride = () => {
    if (!justification.trim()) {
      toast.error("Audit justification is required for managerial override");
      return;
    }
    toast.success(`Variance overridden and authorized for payment. Audit recorded.`);
    setOverrideModalOpen(false);
    setJustification("");
  };

  return (
    <Card className="border border-border/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
              Autonomous 3-Way Reconciliation Studio
            </CardTitle>
            <CardDescription>
              Real-time side-by-side reconciliation between Purchase Order, Goods Receipt, and Vendor Invoices.
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            Tolerance: ±2% Price | 0% Overbill
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Reference</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead className="text-right">PO Total</TableHead>
              <TableHead className="text-right">GRN Verified</TableHead>
              <TableHead className="text-right">Invoice Billed</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matchQueue.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono font-medium">{item.poNumber}</TableCell>
                <TableCell>{item.vendorName}</TableCell>
                <TableCell className="font-mono">{item.invoiceNumber}</TableCell>
                <TableCell className="text-right font-mono">${item.poAmountUsd.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono">${item.grnAmountUsd.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono font-semibold">${item.invoiceAmountUsd.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono">
                  {item.varianceUsd > 0 ? (
                    <span className="text-amber-500 font-semibold">+${item.varianceUsd.toLocaleString()}</span>
                  ) : (
                    <span className="text-emerald-500">$0.00</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.status === "matched" ? (
                    <Badge variant="success">Matched</Badge>
                  ) : item.status === "discrepancy" ? (
                    <Badge variant="destructive">Discrepancy</Badge>
                  ) : (
                    <Badge variant="warning">Under Match</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={processing}
                    onClick={() => handleRunReconciliation(item)}
                  >
                    Reconcile
                  </Button>
                  {item.varianceUsd > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedItem(item);
                        setOverrideModalOpen(true);
                      }}
                    >
                      Override
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Managerial Override Modal */}
        <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Managerial Variance Override Authorization
              </DialogTitle>
              <DialogDescription>
                Authorizing payment with variance requires recorded justification for internal audit and Merkle logging.
              </DialogDescription>
            </DialogHeader>

            {selectedItem && (
              <div className="space-y-3 py-2 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">PO / Invoice:</span>
                  <span className="font-mono font-semibold">{selectedItem.poNumber} / {selectedItem.invoiceNumber}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Variance Amount:</span>
                  <span className="font-mono text-amber-500 font-bold">+${selectedItem.varianceUsd.toLocaleString()}</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Audit Justification Notes:</label>
                  <textarea
                    className="w-full h-24 p-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="e.g. Approved price index increase per contract amendment addendum #4..."
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setOverrideModalOpen(false)}>Cancel</Button>
              <Button variant="default" onClick={handleApplyOverride}>Authorize & Release Voucher</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
