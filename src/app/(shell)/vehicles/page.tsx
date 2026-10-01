"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ensureArray } from "@/lib/utils";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import type { Vehicle, VehicleBooking, VehicleLog, StaffMember, Institution, Tab } from "./_components/types";
import { AddVehicleModal, BookVehicleModal, LogTripModal } from "./_components/modals";
import { VehicleStats } from "./_components/vehicle-stats";
import { FleetTable } from "./_components/fleet-table";
import { BookingsTable } from "./_components/bookings-table";
import { LogsTable } from "./_components/logs-table";
import { useVehicleStore } from "@/stores";

const FUEL_TYPES = ["petrol", "diesel", "electric", "hybrid"] as const;

export default function VehiclesPage() {
  const {
    tab,
    setTab,
    search,
    setSearch,
    fuelFilter,
    setFuelFilter,
    instFilter,
    setInstFilter,
    addVehicleOpen,
    setAddVehicleOpen,
    addVehicleLoading,
    setAddVehicleLoading,
    bookVehicleOpen,
    setBookVehicleOpen,
    bookVehicleLoading,
    setBookVehicleLoading,
    logTripOpen,
    setLogTripOpen,
    logTripLoading,
    setLogTripLoading,
  } = useVehicleStore();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<VehicleBooking[]>([]);
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);

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
        setAddVehicleOpen(false);
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
        setBookVehicleOpen(false);
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
        setLogTripOpen(false);
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

      <VehicleStats
        totalVehicles={vehicles.length}
        activeFleet={activeFleet}
        assignedCount={assignedCount}
        totalMileage={totalMileage}
      />

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
            <FleetTable
              vehicles={filteredVehicles}
              hasFilter={Boolean(search || fuelFilter || instFilter)}
              onAddVehicle={() => setAddVehicleOpen(true)}
            />
          ) : tab === "bookings" ? (
            <BookingsTable
              bookings={bookings}
              onBookVehicle={() => setBookVehicleOpen(true)}
              onDeleteBooking={handleDeleteBooking}
            />
          ) : (
            <LogsTable
              logs={logs}
              onLogTrip={() => setLogTripOpen(true)}
              onDeleteLog={handleDeleteLog}
            />
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
