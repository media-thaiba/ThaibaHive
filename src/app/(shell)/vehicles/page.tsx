"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Vehicle {
  id: string;
  registrationNumber: string;
  model: string;
  type: string;
  capacity: number;
  fuelType: string;
  isActive: boolean;
  institutionId?: string;
  institutionName?: string;
  notes?: string;
}

interface Booking {
  id: string;
  vehicleId: string;
  vehicleReg: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  destination: string;
  bookedByName: string;
  status: string;
  notes?: string;
}

interface DailyLog {
  id: string;
  vehicleId: string;
  vehicleReg: string;
  date: string;
  driverName: string;
  startOdometer: number;
  endOdometer: number;
  distanceKm: number;
  fuelLitres: number;
  fuelCost: number;
  route: string;
  notes?: string;
}

interface Institution {
  id: string;
  name: string;
}

interface VehicleForm {
  registrationNumber: string;
  model: string;
  type: string;
  capacity: number;
  fuelType: string;
  institutionId: string;
  notes: string;
}

interface BookingForm {
  vehicleId: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  destination: string;
  notes: string;
}

interface LogForm {
  vehicleId: string;
  date: string;
  startOdometer: number;
  endOdometer: number;
  distanceKm: number;
  fuelLitres: number;
  fuelCost: number;
  route: string;
  notes: string;
}

export default function VehiclesPage() {
  const [tab, setTab] = useState<"fleet" | "bookings" | "logs">("fleet");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState("");

  const [vForm, setVForm] = useState<VehicleForm>({
    registrationNumber: "",
    model: "",
    type: "bus",
    capacity: 1,
    fuelType: "petrol",
    institutionId: "",
    notes: "",
  });
  const [bForm, setBForm] = useState<BookingForm>({
    vehicleId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "",
    endTime: "",
    purpose: "",
    destination: "",
    notes: "",
  });
  const [lForm, setLForm] = useState<LogForm>({
    vehicleId: "",
    date: new Date().toISOString().split("T")[0],
    startOdometer: 0,
    endOdometer: 0,
    distanceKm: 0,
    fuelLitres: 0,
    fuelCost: 0,
    route: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/vehicles").then((r) => r.json()),
      fetch("/api/vehicles/bookings").then((r) => r.json()),
      fetch("/api/vehicles/logs").then((r) => r.json()),
      fetch("/api/admin/institutions").then((r) => r.json()),
    ])
      .then(([vData, bData, lData, iData]) => {
        setVehicles(Array.isArray(vData.vehicles) ? vData.vehicles : []);
        setBookings(Array.isArray(bData.bookings) ? bData.bookings : []);
        setLogs(Array.isArray(lData.logs) ? lData.logs : []);
        setInstitutions(Array.isArray(iData.institutions) ? iData.institutions : []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load vehicle data:", error);
        setLoading(false);
      });
  }, []);

  async function refreshData() {
    try {
      const [vData, bData, lData] = await Promise.all([
        fetch("/api/vehicles").then((r) => r.json()),
        fetch("/api/vehicles/bookings").then((r) => r.json()),
        fetch("/api/vehicles/logs").then((r) => r.json()),
      ]);
      setVehicles(Array.isArray(vData.vehicles) ? vData.vehicles : []);
      setBookings(Array.isArray(bData.bookings) ? bData.bookings : []);
      setLogs(Array.isArray(lData.logs) ? lData.logs : []);
    } catch (error) {
      console.error("Failed to refresh vehicle data:", error);
    }
  }

  async function addVehicle(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vForm),
      });
      setShowForm(false);
      setVForm({
        registrationNumber: "",
        model: "",
        type: "bus",
        capacity: 1,
        fuelType: "petrol",
        institutionId: "",
        notes: "",
      });
      refreshData();
    } catch (error) {
      console.error("Failed to add vehicle:", error);
    }
  }

  async function addBooking(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetch("/api/vehicles/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bForm),
      });
      setShowForm(false);
      setBForm({
        vehicleId: "",
        date: new Date().toISOString().split("T")[0],
        startTime: "",
        endTime: "",
        purpose: "",
        destination: "",
        notes: "",
      });
      refreshData();
    } catch (error) {
      console.error("Failed to add booking:", error);
    }
  }

  async function addLog(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetch("/api/vehicles/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lForm),
      });
      setShowForm(false);
      setLForm({
        vehicleId: "",
        date: new Date().toISOString().split("T")[0],
        startOdometer: 0,
        endOdometer: 0,
        distanceKm: 0,
        fuelLitres: 0,
        fuelCost: 0,
        route: "",
        notes: "",
      });
      refreshData();
    } catch (error) {
      console.error("Failed to add log:", error);
    }
  }

  if (loading)
    return (
      <div className="flex-1 p-6">
        <Skeleton className="h-8 w-48" />
      </div>
    );

  const tabs = [
    { key: "fleet" as const, label: "Fleet" },
    { key: "bookings" as const, label: "Bookings" },
    { key: "logs" as const, label: "Daily Logs" },
  ];

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vehicle Management</h1>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            setSelectedVehicle("");
          }}
        >
          {showForm
            ? "Cancel"
            : `Add ${tab === "fleet" ? "Vehicle" : tab === "bookings" ? "Booking" : "Log"}`}
        </Button>
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "ghost"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {showForm && tab === "fleet" && (
        <Card>
          <CardHeader>
            <CardTitle>Register Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addVehicle} className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Registration Number"
                value={vForm.registrationNumber}
                onChange={(e) => setVForm({ ...vForm, registrationNumber: e.target.value })}
                required
              />
              <Input
                placeholder="Model"
                value={vForm.model}
                onChange={(e) => setVForm({ ...vForm, model: e.target.value })}
                required
              />
              <Select
                value={vForm.type}
                onChange={(e) => setVForm({ ...vForm, type: e.target.value })}
              >
                <option value="bus">Bus</option>
                <option value="van">Van</option>
                <option value="car">Car</option>
                <option value="auto">Auto</option>
              </Select>
              <Select
                value={vForm.fuelType}
                onChange={(e) => setVForm({ ...vForm, fuelType: e.target.value })}
              >
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="cng">CNG</option>
                <option value="electric">Electric</option>
              </Select>
              <Input
                type="number"
                placeholder="Capacity"
                value={vForm.capacity}
                onChange={(e) => setVForm({ ...vForm, capacity: Number(e.target.value) })}
              />
              <Select
                value={vForm.institutionId}
                onChange={(e) => setVForm({ ...vForm, institutionId: e.target.value })}
              >
                <option value="">No institution</option>
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
              <div className="col-span-2">
                <Button type="submit">Register</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showForm && tab === "bookings" && (
        <Card>
          <CardHeader>
            <CardTitle>Book Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addBooking} className="space-y-3">
              <Select
                value={bForm.vehicleId}
                onChange={(e) => setBForm({ ...bForm, vehicleId: e.target.value })}
                required
              >
                <option value="">Select vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber} ({v.model})
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  value={bForm.date}
                  onChange={(e) => setBForm({ ...bForm, date: e.target.value })}
                  required
                />
                <Input
                  type="time"
                  value={bForm.startTime}
                  onChange={(e) => setBForm({ ...bForm, startTime: e.target.value })}
                  required
                />
              </div>
              <Input
                placeholder="Purpose"
                value={bForm.purpose}
                onChange={(e) => setBForm({ ...bForm, purpose: e.target.value })}
                required
              />
              <Input
                placeholder="Destination"
                value={bForm.destination}
                onChange={(e) => setBForm({ ...bForm, destination: e.target.value })}
              />
              <Button type="submit">Book</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {showForm && tab === "logs" && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Ride Log</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addLog} className="space-y-3">
              <Select
                value={lForm.vehicleId}
                onChange={(e) => setLForm({ ...lForm, vehicleId: e.target.value })}
                required
              >
                <option value="">Select vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber} ({v.model})
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  type="number"
                  placeholder="Start Odometer"
                  value={lForm.startOdometer}
                  onChange={(e) => setLForm({ ...lForm, startOdometer: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  placeholder="End Odometer"
                  value={lForm.endOdometer}
                  onChange={(e) => setLForm({ ...lForm, endOdometer: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Distance (km)"
                  value={lForm.distanceKm}
                  onChange={(e) => setLForm({ ...lForm, distanceKm: Number(e.target.value) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Fuel (litres)"
                  value={lForm.fuelLitres}
                  onChange={(e) => setLForm({ ...lForm, fuelLitres: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Fuel Cost (₹)"
                  value={lForm.fuelCost}
                  onChange={(e) => setLForm({ ...lForm, fuelCost: Number(e.target.value) })}
                />
              </div>
              <Input
                placeholder="Route"
                value={lForm.route}
                onChange={(e) => setLForm({ ...lForm, route: e.target.value })}
              />
              <Button type="submit">Submit Log</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "fleet" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <Card key={v.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm">{v.registrationNumber}</CardTitle>
                  <Badge variant={v.isActive ? "default" : "secondary"} className="text-[10px]">
                    {v.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                <p>
                  {v.model} &middot; <span className="capitalize">{v.type}</span>
                </p>
                <p>
                  Capacity: {v.capacity} &middot; Fuel: <span className="capitalize">{v.fuelType}</span>
                </p>
                {v.institutionName && <p>📍 {v.institutionName}</p>}
              </CardContent>
            </Card>
          ))}
          {vehicles.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">No vehicles registered yet</p>
          )}
        </div>
      )}

      {tab === "bookings" && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Vehicle</th>
                  <th className="px-4 py-3 text-left font-medium">Driver</th>
                  <th className="px-4 py-3 text-left font-medium">Purpose</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">{b.date}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.vehicleReg}</td>
                    <td className="px-4 py-3">{b.bookedByName}</td>
                    <td className="px-4 py-3">{b.purpose}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          b.status === "approved"
                            ? "success"
                            : b.status === "pending"
                              ? "warning"
                              : "destructive"
                        }
                        className="capitalize"
                      >
                        {b.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No bookings yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "logs" && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Vehicle</th>
                  <th className="px-4 py-3 text-left font-medium">Driver</th>
                  <th className="px-4 py-3 text-right font-medium">Distance</th>
                  <th className="px-4 py-3 text-right font-medium">Fuel</th>
                  <th className="px-4 py-3 text-right font-medium">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const efficiency = l.fuelLitres > 0 ? (l.distanceKm / l.fuelLitres).toFixed(1) : "—";
                  return (
                    <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">{l.date}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.vehicleReg}</td>
                      <td className="px-4 py-3">{l.driverName}</td>
                      <td className="px-4 py-3 text-right">
                        {l.distanceKm ? `${l.distanceKm} km` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {l.fuelLitres ? `${l.fuelLitres} L` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {efficiency !== "—" ? `${efficiency} km/L` : "—"}
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No logs yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
