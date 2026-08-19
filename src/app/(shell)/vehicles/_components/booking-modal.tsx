"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import type { Vehicle } from "./types";

export function BookingModal({
  isOpen,
  onClose,
  vehicles,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  onSubmit: (data: {
    vehicleId: string;
    date: string;
    startTime: string;
    endTime: string;
    purpose: string;
    destination: string;
  }) => void;
}) {
  const [vehicleId, setVehicleId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [destination, setDestination] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !date || !startTime || !purpose) return;
    onSubmit({ vehicleId, date, startTime, endTime, purpose, destination });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book Vehicle Requisition</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Select Vehicle</label>
            <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <SelectItem value="">Select Vehicle</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.registrationNumber} ({v.model})
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Start Time</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Purpose</label>
            <Input placeholder="e.g. Field Trip / Admin Duty" value={purpose} onChange={(e) => setPurpose(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Destination</label>
            <Input placeholder="e.g. Central Library Campus" value={destination} onChange={(e) => setDestination(e.target.value)} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Submit Request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
