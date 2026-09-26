"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";

export function CashierTerminal() {
  const [passCode, setPassCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [cart] = useState<{ id: string; name: string; price: number; qty: number }[]>([
    { id: "item_1", name: "Standard Meals", price: 50.0, qty: 1 },
  ]);

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const handleRedeem = async () => {
    if (!passCode.trim()) {
      toast.error("Please enter or scan a meal pass QR code");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; remainingBalance: number }>("/api/canteen/redeem", {
        passCode: passCode.trim(),
        items: cart.map((i) => ({ itemId: i.id, quantity: i.qty, unitPrice: i.price })),
        idempotencyKey: `idem_${Date.now()}`,
      });
      const responseData = (res as any).data || res;
      if (responseData.success) {
        toast.success(`Redemption successful! Remaining Balance: ₹${responseData.remainingBalance}`);
        setPassCode("");
      } else {
        toast.error("Transaction failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Redemption failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Cashier Meal Pass Terminal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Scan or Enter QR Pass Code</label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. CMP-88192-QR"
              value={passCode}
              onChange={(e) => setPassCode(e.target.value)}
              className="font-mono"
            />
            <Button variant="outline" size="icon" onClick={() => setPassCode("CMP-SAMPLE-QR")}>
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="border rounded-lg p-3 bg-muted/40 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order Summary</div>
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between items-center text-sm">
              <span>{item.name} x {item.qty}</span>
              <span className="font-mono">₹{(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-primary font-mono">₹{total.toFixed(2)}</span>
          </div>
        </div>

        <Button className="w-full font-bold" onClick={handleRedeem} disabled={loading}>
          {loading ? "Processing..." : "Deduct & Confirm Meal Pass"}
        </Button>
      </CardContent>
    </Card>
  );
}
