"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Phone, IdCard, QrCode, LogOut, Eye, CheckCircle, XCircle } from "lucide-react";
import type { Visitor } from "./types";

function formatTime(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function getStatusBadge(status: "checked_in" | "checked_out") {
  return status === "checked_in" ? (
    <Badge variant="success" className="gap-1">
      <CheckCircle className="h-3 w-3" />
      On Campus
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1">
      <XCircle className="h-3 w-3" />
      Checked Out
    </Badge>
  );
}

export function VisitorTable({
  visitors,
  onCheckOut,
  onViewPass,
  loading,
}: {
  visitors: Visitor[];
  onCheckOut: (id: string) => void;
  onViewPass: (visitor: Visitor) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (visitors.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="No visitors found"
        description="No visitors match your current filters."
      />
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Visitor</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Host</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Purpose</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Check-in</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {visitors.map((visitor) => (
            <tr key={visitor.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <div className="space-y-1">
                  <p className="font-medium">{visitor.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {visitor.contact && (
                      <>
                        <Phone className="h-3 w-3" />
                        <span>{visitor.contact}</span>
                      </>
                    )}
                  </p>
                  {visitor.idType && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <IdCard className="h-3 w-3" />
                      <span>{visitor.idType}: {visitor.idNumber}</span>
                    </p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <p className="text-sm font-medium">
                  {visitor.hostStaffName
                    ? `${visitor.hostStaffName} ${visitor.hostStaffLastName || ""}`.trim()
                    : "—"}
                </p>
              </td>
              <td className="px-4 py-3 hidden md:table-cell max-w-xs">
                <p className="text-sm text-muted-foreground truncate">{visitor.purpose}</p>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground">
                {formatTime(visitor.checkIn)}
              </td>
              <td className="px-4 py-3">
                {getStatusBadge(visitor.status)}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {visitor.status === "checked_in" && (
                    <>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => onViewPass(visitor)}
                        className="h-8 w-8"
                        aria-label="View visitor pass"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => onCheckOut(visitor.id)}
                        className="h-8 w-8"
                        aria-label="Check out visitor"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {visitor.status === "checked_out" && (
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => onViewPass(visitor)}
                      className="h-8 w-8"
                      aria-label="View visitor pass"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
