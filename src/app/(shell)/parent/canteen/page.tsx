"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { CreditCard, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export default function ParentCanteenPage() {
  const [balance] = useState<number>(350.0);
  const [dietary, setDietary] = useState<string>("Vegetarian, Nut Allergy");

  const handleUpdateDietary = async () => {
    try {
      await api.post("/api/mobile/v1/parent/canteen-balance", {
        studentId: "std_001",
        dietaryFlags: dietary,
      });
      toast.success("Dietary preferences updated successfully");
    } catch {
      toast.error("Failed to update dietary preferences");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Canteen & Meal Pass"
        description="Monitor meal pass balance, cafeteria spending, and safety dietary restrictions"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Active Meal Pass Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">₹{balance.toFixed(2)}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="success">Active</Badge>
              <span className="text-xs text-muted-foreground">Daily Limit: ₹150.00</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" /> Student Dietary Safety Flags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="text"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border rounded-md"
              placeholder="e.g. Vegetarian, Nut Allergy"
            />
            <Button size="sm" onClick={handleUpdateDietary}>Save Dietary Controls</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
