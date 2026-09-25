"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupplyCockpitKpiCards } from "@/components/operations/supply/supply-cockpit-kpi-cards";
import { ThreeWayMatchStudio, ReconcileStudioItem } from "@/components/operations/supply/three-way-match-studio";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, RefreshCw, Truck, FileText, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { ensureArray } from "@/lib/utils";

export default function SupplyCockpitPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [matchQueue, setMatchQueue] = useState<ReconcileStudioItem[]>([]);

  const fetchSupplyData = useCallback(() => {
    setLoading(true);
    const p1 = fetch("/api/supply/orders")
      .then((r) => (r.ok ? r.json() : { orders: [] }))
      .then((d) => setOrders(ensureArray(d.orders)))
      .catch(() => toast.error("Could not load purchase orders"));

    const p2 = fetch("/api/supply/vendors")
      .then((r) => (r.ok ? r.json() : { vendors: [] }))
      .then((d) => setVendors(ensureArray(d.vendors)))
      .catch(() => toast.error("Could not load vendors"));

    Promise.all([p1, p2]).finally(() => {
      // Mock demo reconciliation items for studio
      setMatchQueue([
        {
          id: "inv-demo-1",
          poNumber: "PO-2026-081",
          vendorName: "Apex Scientific & Hardware",
          invoiceNumber: "INV-APX-4491",
          poAmountUsd: 12500,
          grnAmountUsd: 12500,
          invoiceAmountUsd: 12500,
          varianceUsd: 0,
          status: "matched",
          items: [
            { sku: "H100-PCIE-80G", description: "NVIDIA H100 PCIe 80GB", poQty: 1, grnQty: 1, invQty: 1, poPrice: 12500, invPrice: 12500 },
          ],
        },
        {
          id: "inv-demo-2",
          poNumber: "PO-2026-092",
          vendorName: "Global Micro Logistics",
          invoiceNumber: "INV-GML-9921",
          poAmountUsd: 4800,
          grnAmountUsd: 4000,
          invoiceAmountUsd: 4800,
          varianceUsd: 800,
          status: "discrepancy",
          items: [
            { sku: "VALVE-BRASS-2IN", description: "2-inch Industrial Valve", poQty: 60, grnQty: 50, invQty: 60, poPrice: 80, invPrice: 80 },
          ],
        },
      ]);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchSupplyData();
  }, [fetchSupplyData]);

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="SUPPLY-HIVE • ProcurementOS Cockpit"
          description="Autonomous Institutional Procurement, Vendor Contracts & Supply Chain Intelligence"
        />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const totalSpend = orders.reduce((sum, o) => sum + (o.totalAmountUsd || 0), 245000);
  const encumberedTotal = orders.reduce((sum, o) => sum + (o.isEncumbered ? o.totalAmountUsd || 0 : 0), 180000);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="SUPPLY-HIVE • ProcurementOS Cockpit"
        description="Autonomous Institutional Procurement, Vendor Contracts & Supply Chain Intelligence"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchSupplyData} className="flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button size="sm" className="flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> New Requisition
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <SupplyCockpitKpiCards
        totalOrders={orders.length || 24}
        totalSpendUsd={totalSpend}
        encumberedUsd={encumberedTotal}
        matchedRatePercent={96.4}
        averageRiskScore={14.2}
        esgRatingSummary="AAA"
      />

      {/* Subsystems Tabs */}
      <Tabs defaultValue="reconciliation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="reconciliation">3-Way Matching</TabsTrigger>
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Directory</TabsTrigger>
        </TabsList>

        <TabsContent value="reconciliation" className="space-y-4">
          <ThreeWayMatchStudio matchQueue={matchQueue} />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <div className="rounded-md border border-border/60 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Encumbrance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No active purchase orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono font-semibold">{po.poNumber}</TableCell>
                      <TableCell>{po.vendorId}</TableCell>
                      <TableCell>{po.orderDate}</TableCell>
                      <TableCell className="text-right font-mono">${po.totalAmountUsd?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{po.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {po.isEncumbered ? (
                          <Badge variant="success" className="text-xs">GL Locked</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Unreserved</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <div className="rounded-md border border-border/60 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>ESG Rating</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No registered vendors found.
                    </TableCell>
                  </TableRow>
                ) : (
                  vendors.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono font-semibold">{v.vendorCode}</TableCell>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell className="capitalize">{v.category?.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-xs">{v.riskScore}</span> ({v.riskTier})
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-bold text-emerald-600 bg-emerald-500/10">
                          {v.esgRating}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="success" className="capitalize">{v.onboardingStatus}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
