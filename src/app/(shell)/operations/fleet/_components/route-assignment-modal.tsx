"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import type { Vehicle, StaffMember } from "./types";

export function RouteAssignmentModal({
  isOpen,
  onClose,
  vehicles,
  drivers,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  drivers: StaffMember[];
  onSubmit: (data: {
    name: string;
    startLocation: string;
    endLocation: string;
    vehicleId: string;
    driverId: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startLocation || !endLocation) return;
    onSubmit({ name, startLocation, endLocation, vehicleId, driverId });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Campus Transportation Route</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Route Name</label>
            <Input placeholder="e.g. Route 4 - South Campus Shuttle" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Start Location</label>
              <Input placeholder="Main Gate" value={startLocation} onChange={(e) => setStartLocation(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">End Location</label>
              <Input placeholder="Engineering Block" value={endLocation} onChange={(e) => setEndLocation(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Assign Vehicle</label>
              <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                <SelectItem value="">None (Unassigned)</SelectItem>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.registrationNumber} ({v.model})
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Assign Driver</label>
              <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                <SelectItem value="">None (Unassigned)</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.firstName} {d.lastName} {d.designation ? `(${d.designation})` : ""}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Create Route</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
