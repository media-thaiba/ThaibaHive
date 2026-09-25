import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface SparePartItem {
  partNumber: string;
  name: string;
  category: string;
  quantityOnHand: number;
  quantityReserved: number;
  unitCost: number;
}

interface PartsReservationPickerProps {
  availableParts: SparePartItem[];
  selectedParts: { partNumber: string; quantity: number }[];
  onChange: (updated: { partNumber: string; quantity: number }[]) => void;
}

export function PartsReservationPicker({
  availableParts = [],
  selectedParts = [],
  onChange,
}: PartsReservationPickerProps) {
  const handleQuantityChange = (partNumber: string, delta: number) => {
    const existing = selectedParts.find((p) => p.partNumber === partNumber);
    const currentQty = existing ? existing.quantity : 0;
    const newQty = Math.max(0, currentQty + delta);

    if (newQty === 0) {
      onChange(selectedParts.filter((p) => p.partNumber !== partNumber));
    } else if (existing) {
      onChange(selectedParts.map((p) => (p.partNumber === partNumber ? { ...p, quantity: newQty } : p)));
    } else {
      onChange([...selectedParts, { partNumber, quantity: newQty }]);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Required Parts & Consumables Allocation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {availableParts.map((part) => {
          const reserved = selectedParts.find((p) => p.partNumber === part.partNumber)?.quantity || 0;
          const available = part.quantityOnHand - part.quantityReserved;

          return (
            <div
              key={part.partNumber}
              className="flex items-center justify-between p-2 rounded border bg-card/50 text-xs"
            >
              <div>
                <div className="font-medium text-foreground">
                  {part.name} <span className="text-muted-foreground font-mono">({part.partNumber})</span>
                </div>
                <div className="text-muted-foreground flex items-center gap-2 mt-0.5">
                  <Badge variant={available > 0 ? 'secondary' : 'destructive'} className="text-[10px]">
                    Available: {available}
                  </Badge>
                  <span>Unit: ${part.unitCost.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={reserved === 0}
                  onClick={() => handleQuantityChange(part.partNumber, -1)}
                >
                  -
                </Button>
                <span className="w-5 text-center font-bold font-mono">{reserved}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={available <= reserved}
                  onClick={() => handleQuantityChange(part.partNumber, 1)}
                >
                  +
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
