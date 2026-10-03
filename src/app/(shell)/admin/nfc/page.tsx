"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle } from "lucide-react";

type DashboardStats = {
  total: number;
  assigned: number;
  available: number;
  lost: number;
  retired: number;
};

export default function NfcDashboardPage() {
  const { staff, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthorized = staff ? ["super_admin", "admin"].includes(staff.role) : false;

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/nfc/cards?limit=1000");
        const data = await res.json();
        if (data.cards) {
          const cards = data.cards as { status: string }[];
          setStats({
            total: data.total ?? cards.length,
            assigned: cards.filter((c) => c.status === "assigned").length,
            available: cards.filter((c) => c.status === "available").length,
            lost: cards.filter((c) => c.status === "lost").length,
            retired: cards.filter((c) => c.status === "retired").length,
          });
        }
      } catch {
        setStats(null);
      }
      setLoading(false);
    };
    fetchStats();
  }, [isAuthorized]);

  if (authLoading || (loading && isAuthorized)) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-4 w-20" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex-1 p-6 lg:p-8 flex items-center justify-center min-h-[70vh]">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5 text-center">
          <CardHeader className="flex flex-col items-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-2" />
            <CardTitle className="text-lg font-bold text-destructive">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Only operators with administrator privileges are permitted to view or manage NFC card operations.
            </p>
            <Button variant="outline" onClick={() => window.location.href = "/"}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">NFC Card Management</h1>
        <Link href="/admin/nfc/cards">
          <Button>Manage Cards</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Total Cards</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats?.total ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Assigned</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">{stats?.assigned ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-info">{stats?.available ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Lost / Retired</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{(stats?.lost ?? 0) + (stats?.retired ?? 0)}</p>
            <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
              <Badge variant="warning">{stats?.lost ?? 0} lost</Badge>
              <Badge variant="secondary">{stats?.retired ?? 0} retired</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
