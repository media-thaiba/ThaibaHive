"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { Vehicle, Institution, StaffMember } from "./types";

const FUEL_TYPES = ["petrol", "diesel", "electric", "hybrid"] as const;
const VEHICLE_TYPES = ["sedan", "suv", "van", "bus", "truck", "motorcycle", "other"] as const;

export function AddVehicleModal({
  open,
  onClose,
  onSubmit,
  institutions,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    registrationNumber: string;
    model: string;
    type: string;
    capacity: number;
    fuelType: string;
    institutionId: string;
    notes: string;
  }) => Promise<void>;
  institutions: Institution[];
  loading: boolean;
}) {
  const [form, setForm] = useState({
    registrationNumber: "",
    model: "",
    type: "sedan",
    capacity: 4,
    fuelType: "petrol",
    institutionId: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const validate = () => {
    const e: Partial<Record<string, string>> = {};
    if (!form.registrationNumber.trim()) e.registrationNumber = "Registration number is required";
    if (!form.model.trim()) e.model = "Model is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    await onSubmit({
      registrationNumber: form.registrationNumber.trim(),
      model: form.model.trim(),
      type: form.type,
      capacity: form.capacity,
      fuelType: form.fuelType,
      institutionId: form.institutionId,
      notes: form.notes,
    });
    onClose();
    setForm({ registrationNumber: "", model: "", type: "sedan", capacity: 4, fuelType: "petrol", institutionId: "", notes: "" });
    setErrors({});
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
          <DialogDescription>Register a new vehicle in the fleet</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 p-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Registration Number <span className="text-destructive">*</span></label>
            <Input
              placeholder="e.g. TN-01-AB-1234"
              value={form.registrationNumber}
              onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
              className={errors.registrationNumber ? "border-destructive" : ""}
            />
            {errors.registrationNumber && <p className="text-xs text-destructive">{errors.registrationNumber}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Model <span className="text-destructive">*</span></label>
            <Input
              placeholder="e.g. Toyota Innova"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className={errors.model ? "border-destructive" : ""}
            />
            {errors.model && <p className="text-xs text-destructive">{errors.model}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Vehicle Type</label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {VEHICLE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fuel Type</label>
              <Select value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>
                {FUEL_TYPES.map((f) => (
                  <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Seat Capacity</label>
              <Input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Institution</label>
              <Select value={form.institutionId} onChange={(e) => setForm({ ...form, institutionId: e.target.value })}>
                <SelectItem value="">None</SelectItem>
                {institutions.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Optional notes about the vehicle"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Vehicle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BookVehicleModal({
  open,
  onClose,
  onSubmit,
  vehicles,
  staffList,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    vehicleId: string;
    date: string;
    startTime: string;
    endTime: string;
    purpose: string;
    destination: string;
    notes: string;
  }) => Promise<void>;
  vehicles: Vehicle[];
  staffList: StaffMember[];
  loading: boolean;
}) {
  const [form, setForm] = useState({
    vehicleId: "",
    date: "",
    startTime: "",
    endTime: "",
    purpose: "",
    destination: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const validate = () => {
    const e: Partial<Record<string, string>> = {};
    if (!form.vehicleId) e.vehicleId = "Select a vehicle";
    if (!form.date) e.date = "Date is required";
    if (!form.startTime) e.startTime = "Start time is required";
    if (!form.purpose.trim()) e.purpose = "Purpose is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    await onSubmit({
      vehicleId: form.vehicleId,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      purpose: form.purpose.trim(),
      destination: form.destination,
      notes: form.notes,
    });
    onClose();
    setForm({ vehicleId: "", date: "", startTime: "", endTime: "", purpose: "", destination: "", notes: "" });
    setErrors({});
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Vehicle</DialogTitle>
          <DialogDescription>Reserve a vehicle for a trip</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 p-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Vehicle <span className="text-destructive">*</span></label>
            <Select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} className={errors.vehicleId ? "border-destructive" : ""}>
              <SelectItem value="">Select vehicle</SelectItem>
              {vehicles.filter((v) => v.isActive).map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.registrationNumber} — {v.model}</SelectItem>
              ))}
            </Select>
            {errors.vehicleId && <p className="text-xs text-destructive">{errors.vehicleId}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date <span className="text-destructive">*</span></label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={errors.date ? "border-destructive" : ""}
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Driver (Staff)</label>
              <Select value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}>
                <SelectItem value="">Optional driver</SelectItem>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={`driver:${s.id}`}>{s.firstName} {s.lastName}</SelectItem>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start Time <span className="text-destructive">*</span></label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className={errors.startTime ? "border-destructive" : ""}
              />
              {errors.startTime && <p className="text-xs text-destructive">{errors.startTime}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">End Time</label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Purpose <span className="text-destructive">*</span></label>
            <Input
              placeholder="e.g. Field visit, official trip"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              className={errors.purpose ? "border-destructive" : ""}
            />
            {errors.purpose && <p className="text-xs text-destructive">{errors.purpose}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Destination</label>
            <Input
              placeholder="e.g. District Office"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
            />
          </div>
          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Book Vehicle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LogTripModal({
  open,
  onClose,
  onSubmit,
  vehicles,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    vehicleId: string;
    date: string;
    startOdometer: string;
    endOdometer: string;
    fuelLitres: string;
    fuelCost: string;
    route: string;
    notes: string;
  }) => Promise<void>;
  vehicles: Vehicle[];
  loading: boolean;
}) {
  const [form, setForm] = useState({
    vehicleId: "",
    date: "",
    startOdometer: "",
    endOdometer: "",
    fuelLitres: "",
    fuelCost: "",
    route: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const validate = () => {
    const e: Partial<Record<string, string>> = {};
    if (!form.vehicleId) e.vehicleId = "Select a vehicle";
    if (!form.date) e.date = "Date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
    onClose();
    setForm({ vehicleId: "", date: "", startOdometer: "", endOdometer: "", fuelLitres: "", fuelCost: "", route: "", notes: "" });
    setErrors({});
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Trip Mileage</DialogTitle>
          <DialogDescription>Record odometer readings and fuel usage for a trip</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 p-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Vehicle <span className="text-destructive">*</span></label>
            <Select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} className={errors.vehicleId ? "border-destructive" : ""}>
              <SelectItem value="">Select vehicle</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.registrationNumber} — {v.model}</SelectItem>
              ))}
            </Select>
            {errors.vehicleId && <p className="text-xs text-destructive">{errors.vehicleId}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date <span className="text-destructive">*</span></label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={errors.date ? "border-destructive" : ""}
            />
            {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start Odometer (km)</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={form.startOdometer}
                onChange={(e) => setForm({ ...form, startOdometer: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">End Odometer (km)</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={form.endOdometer}
                onChange={(e) => setForm({ ...form, endOdometer: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fuel Consumed (L)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={form.fuelLitres}
                onChange={(e) => setForm({ ...form, fuelLitres: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fuel Cost (₹)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={form.fuelCost}
                onChange={(e) => setForm({ ...form, fuelCost: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Route</label>
            <Input
              placeholder="e.g. HQ → District Office → Return"
              value={form.route}
              onChange={(e) => setForm({ ...form, route: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Optional notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Log Trip
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
