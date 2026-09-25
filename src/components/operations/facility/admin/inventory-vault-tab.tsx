import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface InventoryVaultTabProps {
  parts: any[];
  requisitions?: any[];
  onTriggerReorderScan?: () => void;
}

export function InventoryVaultTab({
  parts = [],
  requisitions = [],
  onTriggerReorderScan,
}: InventoryVaultTabProps) {
  return (
    <div className="space-y-6">
      {/* Purchase Requisitions Summary if any */}
      {requisitions.length > 0 && (
        <Card className="shadow-sm border-amber-500/30 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                Automated Purchase Requisitions Required ({requisitions.length} Items Low Stock)
              </CardTitle>
              <div className="text-xs text-muted-foreground mt-0.5">
                AI automated replenishment order generation based on min thresholds and lead times
              </div>
            </div>
            {onTriggerReorderScan && (
              <Button size="sm" variant="outline" onClick={onTriggerReorderScan}>
                Re-Scan Catalog
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Part Number</TableHead>
                  <TableHead className="text-xs">Part Name</TableHead>
                  <TableHead className="text-xs">Current Stock</TableHead>
                  <TableHead className="text-xs">Suggested Order Qty</TableHead>
                  <TableHead className="text-xs">Est. Cost</TableHead>
                  <TableHead className="text-xs">Supplier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requisitions.map((req) => (
                  <TableRow key={req.requisitionId}>
                    <TableCell className="font-mono text-xs font-semibold">{req.partNumber}</TableCell>
                    <TableCell className="text-xs">{req.partName}</TableCell>
                    <TableCell className="text-xs font-mono text-destructive font-bold">{req.currentStock}</TableCell>
                    <TableCell className="text-xs font-mono font-bold text-primary">{req.suggestedReorderQuantity}</TableCell>
                    <TableCell className="text-xs font-mono">${req.totalEstimatedCost.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{req.supplierName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Parts Catalog Table */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">Spare Parts & Consumables Catalog</CardTitle>
            <div className="text-xs text-muted-foreground mt-0.5">
              Real-time stock counts, work order allocations, and replenishment tracking
            </div>
          </div>
          {onTriggerReorderScan && requisitions.length === 0 && (
            <Button size="sm" variant="outline" onClick={onTriggerReorderScan}>
              Scan Reorder Triggers
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Part Number</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">On Hand</TableHead>
                <TableHead className="text-xs">Reserved</TableHead>
                <TableHead className="text-xs">Available</TableHead>
                <TableHead className="text-xs">Unit Cost</TableHead>
                <TableHead className="text-xs">Stock Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.map((p) => {
                const available = p.quantityOnHand - p.quantityReserved;
                const isLow = available <= p.reorderThreshold;

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs font-semibold">{p.partNumber}</TableCell>
                    <TableCell className="text-xs font-medium">{p.name}</TableCell>
                    <TableCell className="text-xs capitalize">{p.category}</TableCell>
                    <TableCell className="text-xs font-mono">{p.quantityOnHand}</TableCell>
                    <TableCell className="text-xs font-mono">{p.quantityReserved}</TableCell>
                    <TableCell className="text-xs font-mono font-bold">{available}</TableCell>
                    <TableCell className="text-xs font-mono">${p.unitCost.toFixed(2)}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant={isLow ? 'destructive' : 'success'}>
                        {isLow ? 'Low Stock' : 'Optimal'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
