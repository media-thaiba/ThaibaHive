"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ensureArray } from "@/lib/utils";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import {
  Truck,
  Car,
  Calendar,
  Fuel,
  Plus,
  Search,
  Filter,
  Loader2,
  X,
  MapPin,
  Gauge,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Vehicle = {
  id: string;
  registrationNumber: string;
  model: string;
  type: string;
  capacity: number;
  fuelType: string;
  isActive: boolean;
  institutionName: string | null;
  notes: string | null;
};

type VehicleBooking = {
  id: string;
  vehicleId: string;
  date: string;
  startTime: string;
  endTime: string | null;
  purpose: string;
  destination: string | null;
  status: string;
  bookedByName: string | null;
  bookedByLastName: string | null;
  vehicleReg: string | null;
};

type VehicleLog = {
  id: string;
  vehicleId: string;
  date: string;
  startOdometer: number | null;
  endOdometer: number | null;
  distanceKm: number | null;
  fuelLitres: number | null;
  fuelCost: number | null;
  route: string | null;
  notes: string | null;
  driverName: string | null;
  driverLastName: string | null;
  vehicleReg: string | null;
};

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  designation: string | null;
};

type Institution = {
  id: string;
  name: string;
};

type Tab = "fleet" | "bookings" | "logs";

const FUEL_TYPES = ["petrol", "diesel", "electric", "hybrid"] as const;
const VEHICLE_TYPES = ["sedan", "suv", "van", "bus", "truck", "motorcycle", "other"] as const;

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight mt-1">{value}</p>
          </div>
          <div className={cn("p-3 rounded-xl", color)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getFuelBadge(fuelType: string) {
  const map: Record<string, { variant: "success" | "info" | "warning" | "secondary"; label: string }> = {
    electric: { variant: "success", label: "Electric" },
    hybrid: { variant: "info", label: "Hybrid" },
    diesel: { variant: "warning", label: "Diesel" },
    petrol: { variant: "secondary", label: "Petrol" },
  };
  const match = map[fuelType.toLowerCase()] || { variant: "secondary" as const, label: fuelType };
  return <Badge variant={match.variant}>{match.label}</Badge>;
}

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

function AddVehicleModal({
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

function BookVehicleModal({
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

function LogTripModal({
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

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<VehicleBooking[]>([]);
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("fleet");
  const [search, setSearch] = useState("");
  const [fuelFilter, setFuelFilter] = useState("");
  const [instFilter, setInstFilter] = useState("");

  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [addVehicleLoading, setAddVehicleLoading] = useState(false);
  const [bookVehicleOpen, setBookVehicleOpen] = useState(false);
  const [bookVehicleLoading, setBookVehicleLoading] = useState(false);
  const [logTripOpen, setLogTripOpen] = useState(false);
  const [logTripLoading, setLogTripLoading] = useState(false);

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await api.get<{ vehicles: Vehicle[] }>("/api/vehicles");
      if (res.ok && res.data) {
        setVehicles(ensureArray(res.data.vehicles));
      }
    } catch (err) {
      console.error("Failed to fetch vehicles:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get<{ bookings: VehicleBooking[] }>("/api/vehicles/bookings");
      if (res.ok && res.data) {
        setBookings(ensureArray(res.data.bookings));
      }
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.get<{ logs: VehicleLog[] }>("/api/vehicles/logs");
      if (res.ok && res.data) {
        setLogs(ensureArray(res.data.logs));
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await api.get<{ staff: StaffMember[] }>("/api/staff");
      if (res.ok && res.data) setStaffList(ensureArray(res.data.staff));
    } catch (err) {
      console.error("Failed to fetch staff:", err);
    }
  }, []);

  const fetchInstitutions = useCallback(async () => {
    try {
      const res = await api.get<{ institutions: Institution[] }>("/api/institutions");
      if (res.ok && res.data) setInstitutions(ensureArray(res.data.institutions));
    } catch (err) {
      console.error("Failed to fetch institutions:", err);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
    fetchStaff();
    fetchInstitutions();
  }, [fetchVehicles, fetchStaff, fetchInstitutions]);

  useEffect(() => {
    if (tab === "bookings") fetchBookings();
    if (tab === "logs") fetchLogs();
  }, [tab, fetchBookings, fetchLogs]);

  const filteredVehicles = vehicles.filter((v) => {
    const matchSearch =
      !search ||
      v.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase());
    const matchFuel = !fuelFilter || v.fuelType.toLowerCase() === fuelFilter.toLowerCase();
    const matchInst = !instFilter || (v.institutionName || "").toLowerCase() === instFilter.toLowerCase();
    return matchSearch && matchFuel && matchInst;
  });

  const totalMileage = logs.reduce((sum, l) => sum + (l.distanceKm || 0), 0);
  const activeFleet = vehicles.filter((v) => v.isActive).length;
  const assignedCount = bookings.filter((b) => b.status === "approved" || b.status === "pending").length;

  const uniqueInstitutions = [...new Set(vehicles.map((v) => v.institutionName).filter(Boolean))];

  const handleAddVehicle = async (data: {
    registrationNumber: string;
    model: string;
    type: string;
    capacity: number;
    fuelType: string;
    institutionId: string;
    notes: string;
  }) => {
    setAddVehicleLoading(true);
    try {
      const res = await api.post<{ vehicle: Vehicle }>("/api/vehicles", {
        registrationNumber: data.registrationNumber,
        model: data.model,
        type: data.type,
        capacity: data.capacity,
        fuelType: data.fuelType,
        institutionId: data.institutionId || null,
        notes: data.notes || null,
      });
      if (res.ok && res.data) {
        toast.success("Vehicle added successfully");
        setVehicles((prev) => [res.data!.vehicle, ...prev]);
      } else {
        toast.error("Failed to add vehicle");
      }
    } catch (err) {
      console.error("Add vehicle error:", err);
      toast.error("Failed to add vehicle");
    } finally {
      setAddVehicleLoading(false);
    }
  };

  const handleBookVehicle = async (data: {
    vehicleId: string;
    date: string;
    startTime: string;
    endTime: string;
    purpose: string;
    destination: string;
    notes: string;
  }) => {
    setBookVehicleLoading(true);
    try {
      const res = await api.post<{ booking: VehicleBooking }>("/api/vehicles/bookings", {
        vehicleId: data.vehicleId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime || null,
        purpose: data.purpose,
        destination: data.destination || null,
        notes: data.notes || null,
      });
      if (res.ok && res.data) {
        toast.success("Vehicle booked successfully");
        setBookings((prev) => [res.data!.booking, ...prev]);
      } else {
        toast.error("Failed to book vehicle");
      }
    } catch (err) {
      console.error("Book vehicle error:", err);
      toast.error("Failed to book vehicle");
    } finally {
      setBookVehicleLoading(false);
    }
  };

  const handleLogTrip = async (data: {
    vehicleId: string;
    date: string;
    startOdometer: string;
    endOdometer: string;
    fuelLitres: string;
    fuelCost: string;
    route: string;
    notes: string;
  }) => {
    setLogTripLoading(true);
    try {
      const startOdo = data.startOdometer ? parseInt(data.startOdometer) : null;
      const endOdo = data.endOdometer ? parseInt(data.endOdometer) : null;
      const res = await api.post<{ log: VehicleLog }>("/api/vehicles/logs", {
        vehicleId: data.vehicleId,
        date: data.date,
        startOdometer: startOdo,
        endOdometer: endOdo,
        distanceKm: startOdo !== null && endOdo !== null ? endOdo - startOdo : null,
        fuelLitres: data.fuelLitres ? parseFloat(data.fuelLitres) : null,
        fuelCost: data.fuelCost ? parseFloat(data.fuelCost) : null,
        route: data.route || null,
        notes: data.notes || null,
      });
      if (res.ok && res.data) {
        toast.success("Trip logged successfully");
        setLogs((prev) => [res.data!.log, ...prev]);
      } else {
        toast.error("Failed to log trip");
      }
    } catch (err) {
      console.error("Log trip error:", err);
      toast.error("Failed to log trip");
    } finally {
      setLogTripLoading(false);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    try {
      const res = await api.delete(`/api/vehicles/bookings/${id}`);
      if (res.ok) {
        toast.success("Booking cancelled");
        setBookings((prev) => prev.filter((b) => b.id !== id));
      } else {
        toast.error("Failed to cancel booking");
      }
    } catch (err) {
      console.error("Delete booking error:", err);
      toast.error("Failed to cancel booking");
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      const res = await api.delete(`/api/vehicles/logs/${id}`);
      if (res.ok) {
        toast.success("Log deleted");
        setLogs((prev) => prev.filter((l) => l.id !== id));
      } else {
        toast.error("Failed to delete log");
      }
    } catch (err) {
      console.error("Delete log error:", err);
      toast.error("Failed to delete log");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <PageHeader
        title="Fleet & Vehicle Management"
        description="Manage vehicles, bookings, and trip mileage logs"
        actions={
          <div className="flex gap-2">
            {tab === "fleet" && (
              <Button onClick={() => setAddVehicleOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            )}
            {tab === "bookings" && (
              <Button onClick={() => setBookVehicleOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Book Vehicle
              </Button>
            )}
            {tab === "logs" && (
              <Button onClick={() => setLogTripOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Log Trip
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Vehicles" value={vehicles.length} icon={Truck} color="bg-primary" />
        <MetricCard title="Active Fleet" value={activeFleet} icon={Car} color="bg-success" />
        <MetricCard title="Assigned / In Trip" value={assignedCount} icon={Calendar} color="bg-info" />
        <MetricCard title="Total Mileage (km)" value={Math.round(totalMileage)} icon={Gauge} color="bg-warning" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Vehicle Management</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reg. no. or model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-56"
              />
            </div>
            {tab === "fleet" && (
              <>
                <Select value={fuelFilter} onChange={(e) => setFuelFilter(e.target.value)}>
                  <SelectItem value="">All Fuel Types</SelectItem>
                  {FUEL_TYPES.map((f) => (
                    <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>
                  ))}
                </Select>
                <Select value={instFilter} onChange={(e) => setInstFilter(e.target.value)}>
                  <SelectItem value="">All Institutions</SelectItem>
                  {uniqueInstitutions.map((name) => (
                    <SelectItem key={name} value={name!}>{name}</SelectItem>
                  ))}
                </Select>
              </>
            )}
            <div className="flex gap-1 bg-muted p-1 rounded-lg" role="tablist">
              {([
                { value: "fleet" as Tab, label: "Fleet" },
                { value: "bookings" as Tab, label: "Bookings" },
                { value: "logs" as Tab, label: "Logs" },
              ]).map((t) => (
                <Button
                  key={t.value}
                  variant={tab === t.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTab(t.value)}
                  role="tab"
                  aria-selected={tab === t.value}
                  className="gap-1"
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : tab === "fleet" ? (
            filteredVehicles.length === 0 ? (
              <EmptyState
                icon={<Truck className="h-12 w-12" />}
                title="No vehicles found"
                description={search || fuelFilter || instFilter ? "No vehicles match your filters." : "Add your first vehicle to get started."}
                action={!search && !fuelFilter && !instFilter ? { label: "Add Vehicle", onClick: () => setAddVehicleOpen(true) } : undefined}
              />
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Vehicle</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Fuel</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Capacity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Institution</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredVehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium font-mono text-sm">{v.registrationNumber}</p>
                            <p className="text-xs text-muted-foreground">{v.model}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm capitalize">{v.type}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">{getFuelBadge(v.fuelType)}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm">{v.capacity} seats</span>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <span className="text-sm">{v.institutionName || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={v.isActive ? "success" : "secondary"}>
                            {v.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : tab === "bookings" ? (
            bookings.length === 0 ? (
              <EmptyState
                icon={<Calendar className="h-12 w-12" />}
                title="No bookings found"
                description="Book a vehicle to see reservations here."
                action={{ label: "Book Vehicle", onClick: () => setBookVehicleOpen(true) }}
              />
            ) : (
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
                            onClick={() => handleDeleteBooking(b.id)}
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
            )
          ) : (
            logs.length === 0 ? (
              <EmptyState
                icon={<Fuel className="h-12 w-12" />}
                title="No trip logs found"
                description="Log a trip to see mileage records here."
                action={{ label: "Log Trip", onClick: () => setLogTripOpen(true) }}
              />
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Vehicle</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Odometer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Fuel</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Route</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {logs.map((l) => (
                      <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium font-mono text-sm">{l.vehicleReg || "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {l.driverName ? `${l.driverName} ${l.driverLastName || ""}`.trim() : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-sm">{formatDate(l.date)}</td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="text-sm">
                            {l.startOdometer != null && l.endOdometer != null ? (
                              <>
                                <span>{l.startOdometer.toLocaleString()} → {l.endOdometer.toLocaleString()} km</span>
                                {l.distanceKm != null && (
                                  <span className="ml-2 text-muted-foreground">({l.distanceKm.toLocaleString()} km)</span>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="text-sm">
                            {l.fuelLitres != null ? <span>{l.fuelLitres} L</span> : <span className="text-muted-foreground">—</span>}
                            {l.fuelCost != null && <span className="ml-2 text-muted-foreground">₹{l.fuelCost.toLocaleString()}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <span className="text-sm truncate max-w-[200px] block">{l.route || "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDeleteLog(l.id)}
                            className="h-8 w-8 text-destructive"
                            aria-label="Delete log"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </CardContent>
      </Card>

      <AddVehicleModal
        open={addVehicleOpen}
        onClose={() => setAddVehicleOpen(false)}
        onSubmit={handleAddVehicle}
        institutions={institutions}
        loading={addVehicleLoading}
      />
      <BookVehicleModal
        open={bookVehicleOpen}
        onClose={() => setBookVehicleOpen(false)}
        onSubmit={handleBookVehicle}
        vehicles={vehicles}
        staffList={staffList}
        loading={bookVehicleLoading}
      />
      <LogTripModal
        open={logTripOpen}
        onClose={() => setLogTripOpen(false)}
        onSubmit={handleLogTrip}
        vehicles={vehicles}
        loading={logTripLoading}
      />
    </div>
  );
}
