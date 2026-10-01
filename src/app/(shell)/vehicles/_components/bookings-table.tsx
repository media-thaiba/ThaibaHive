"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar, CheckCircle, XCircle, Clock, MapPin, Trash2 } from "lucide-react";
import type { VehicleBooking } from "./types";

function getBookingStatusBadge(status: string) {
  if (status === "approved" || status === "completed")
    return <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" />{status}</Badge>;
  if (status === "rejected" || status === "cancelled")
    return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{status}</Badge>;
  return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" />{status}</Badge>;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "—";
  return timeStr;
}

interface BookingsTableProps {
  bookings: VehicleBooking[];
  onBookVehicle: () => void;
  onDeleteBooking: (id: string) => void;
}

export function BookingsTable({
  bookings,
  onBookVehicle,
  onDeleteBooking,
}: BookingsTableProps) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="h-12 w-12" />}
        title="No bookings found"
        description="Book a vehicle to see reservations here."
        action={{ label: "Book Vehicle", onClick: onBookVehicle }}
      />
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Vehicle</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Date & Time</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Purpose</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Booked By</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {bookings.map((b) => (
            <tr key={b.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium font-mono text-sm">{b.vehicleReg || "—"}</p>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <div className="text-sm">
                  <p>{formatDate(b.date)}</p>
                  <p className="text-muted-foreground text-xs">{formatTime(b.startTime)}{b.endTime ? ` – ${formatTime(b.endTime)}` : ""}</p>
                </div>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <div className="text-sm">
                  <p className="truncate max-w-[200px]">{b.purpose}</p>
                  {b.destination && <p className="text-muted-foreground text-xs flex items-center gap-1"><MapPin className="h-3 w-3" />{b.destination}</p>}
                </div>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <span className="text-sm">
                  {b.bookedByName ? `${b.bookedByName} ${b.bookedByLastName || ""}`.trim() : "—"}
                </span>
              </td>
              <td className="px-4 py-3">{getBookingStatusBadge(b.status)}</td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDeleteBooking(b.id)}
                  className="h-8 w-8 text-destructive"
                  aria-label="Cancel booking"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
