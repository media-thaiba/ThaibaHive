"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertTriangle,
  Building,
  Laptop,
  Car,
  Layers,
  Inbox
} from "lucide-react";

type Resource = {
  id: string;
  name: string;
  type: string;
  capacity: number | null;
  location: string | null;
  description: string | null;
};

type Booking = {
  id: string;
  resourceId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  bookedByName: string;
  bookedByLastName: string;
  resourceName: string;
};

type Permissions = { role: string; permissions: string[] };

const statusVariant: Record<string, "info" | "warning" | "success" | "secondary"> = {
  pending: "warning",
  approved: "success",
  confirmed: "success",
  rejected: "secondary",
};

export default function BookingsPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [selectedResource, setSelectedResource] = useState<string>("");

  // Booking Form State
  const [form, setForm] = useState({
    resourceId: "",
    title: "",
    startTime: "",
    endTime: "",
    description: "",
  });

  // Resource Form State (Admin Only)
  const [resForm, setResForm] = useState({
    name: "",
    type: "room",
    capacity: "",
    location: "",
    description: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const isAdmin = permissions?.role === "super_admin" || (permissions?.permissions.includes("bookings:manage") ?? false);
  const currentStaffId = permissions?.role ? (permissions as any).staffId : null;

  const loadData = useCallback(async () => {
    try {
      const [resData, bookData, permsData] = await Promise.all([
        fetch("/api/bookings/resources").then((r) => r.json()),
        fetch("/api/bookings").then((r) => r.json()),
        fetch("/api/auth/permissions").then((r) => r.json()).catch(() => ({ permissions: [], role: "" })),
      ]);

      setResources(Array.isArray(resData.resources) ? resData.resources : []);
      setBookings(Array.isArray(bookData.bookings) ? bookData.bookings : []);
      if (permsData.role) setPermissions(permsData);
    } catch {
      setError("Failed to fetch booking details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.resourceId || !form.title || !form.startTime || !form.endTime) {
      setError("Please fill out all required fields");
      return;
    }

    // Client-side quick duration check
    const start = new Date(form.startTime).getTime();
    const end = new Date(form.endTime).getTime();
    if (end <= start) {
      setError("End time must be after start time");
      return;
    }

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSuccess("Booking request submitted successfully.");
        toast.success("Booking request submitted");
        setShowForm(false);
        setForm({ resourceId: "", title: "", startTime: "", endTime: "", description: "" });
        loadData();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to book resource. Overlaps are not allowed.");
        toast.error(d.error || "Booking overlap/conflict detected");
      }
    } catch {
      setError("Failed to book resource due to a network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resForm.name.trim() || !resForm.type) {
      setError("Resource name and type are required");
      return;
    }

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/bookings/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...resForm,
          capacity: resForm.capacity ? Number(resForm.capacity) : undefined,
        }),
      });

      if (res.ok) {
        setSuccess("New resource created successfully.");
        toast.success("Resource created");
        setShowResourceForm(false);
        setResForm({ name: "", type: "room", capacity: "", location: "", description: "" });
        loadData();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to create resource");
      }
    } catch {
      setError("Network error. Failed to create resource.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Booking cancelled successfully");
        loadData();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to cancel booking");
      }
    } catch {
      toast.error("Network error. Failed to cancel booking.");
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "room":
      case "hall":
      case "lab":
        return <Building className="h-6 w-6 text-primary shrink-0" />;
      case "equipment":
      case "projector":
      case "laptop":
        return <Laptop className="h-6 w-6 text-violet-500 shrink-0" />;
      case "vehicle":
        return <Car className="h-6 w-6 text-emerald-500 shrink-0" />;
      default:
        return <Layers className="h-6 w-6 text-muted-foreground shrink-0" />;
    }
  };

  const filteredBookings = selectedResource
    ? bookings.filter((b) => b.resourceId === selectedResource)
    : bookings;

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-primary" /> Room & Resource Bookings
        </h1>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="secondary" onClick={() => setShowResourceForm(!showResourceForm)}>
              {showResourceForm ? "Cancel Add" : <><Plus className="h-4 w-4 mr-1.5" /> Add Resource</>}
            </Button>
          )}
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel Book" : <><Plus className="h-4 w-4 mr-1.5" /> New Booking</>}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" onDismiss={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onDismiss={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* Admin Add Resource Form */}
      {showResourceForm && isAdmin && (
        <Card className="max-w-2xl border bg-card shadow-sm animate-in fade-in duration-200">
          <CardHeader>
            <CardTitle>Register a Resource / Asset for Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateResource} className="space-y-4">
              <Input
                placeholder="Resource Name (e.g., Seminar Hall A, Projector 2)"
                value={resForm.name}
                onChange={(e) => setResForm({ ...resForm, name: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={resForm.type}
                  onChange={(e) => setResForm({ ...resForm, type: e.target.value })}
                >
                  <SelectItem value="room">Room / Venue</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="other">Other Asset</SelectItem>
                </Select>

                <Input
                  type="number"
                  placeholder="Capacity / Quantity (e.g., 50)"
                  value={resForm.capacity}
                  onChange={(e) => setResForm({ ...resForm, capacity: e.target.value })}
                />
              </div>

              <Input
                placeholder="Location / Floor / Room Number"
                value={resForm.location}
                onChange={(e) => setResForm({ ...resForm, location: e.target.value })}
              />

              <Textarea
                placeholder="Resource description or usage guide..."
                value={resForm.description}
                onChange={(e) => setResForm({ ...resForm, description: e.target.value })}
                rows={3}
              />

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Adding..." : "Register Resource"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* New Booking Form */}
      {showForm && (
        <Card className="max-w-2xl border bg-card shadow-sm animate-in fade-in duration-200">
          <CardHeader>
            <CardTitle>Reserve a Resource</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBook} className="space-y-4">
              <Select
                value={form.resourceId}
                onChange={(e) => setForm({ ...form, resourceId: e.target.value })}
                required
              >
                <option value="">Choose resource to book...</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.type}) {r.location ? ` - ${r.location}` : ""}
                  </option>
                ))}
              </Select>

              <Input
                placeholder="Booking Title / Event Name / Purpose"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-semibold">Start Time</label>
                  <Input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-semibold">End Time</label>
                  <Input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Textarea
                placeholder="Additional notes, technical setup requirements, etc..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Reserving..." : "Request Booking"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Main Board Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Resources Directory */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Resources</h2>
          <div className="space-y-3">
            <Card 
              onClick={() => setSelectedResource("")}
              className={`cursor-pointer hover:shadow-sm transition-shadow ${
                selectedResource === "" ? "border-primary border-2" : "border"
              }`}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <Layers className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-semibold text-sm">All Resources</h3>
                  <p className="text-[10px] text-muted-foreground">Show booking schedule for everything</p>
                </div>
              </CardContent>
            </Card>

            {resources.map((r) => (
              <Card
                key={r.id}
                onClick={() => setSelectedResource(r.id)}
                className={`cursor-pointer hover:shadow-sm transition-shadow ${
                  selectedResource === r.id ? "border-primary border-2" : "border"
                }`}
              >
                <CardContent className="p-4 flex gap-3">
                  {getResourceIcon(r.type)}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{r.name}</h3>
                    {r.location && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" /> {r.location}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[9px] py-0 capitalize">{r.type}</Badge>
                      {r.capacity && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Users className="h-3 w-3" /> {r.capacity} capacity
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Side: Availability Calendar / Bookings Schedule */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold">Booking Schedule</h2>
          <div className="space-y-3">
            {filteredBookings.map((b) => (
              <Card key={b.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex justify-between items-start gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm truncate">{b.title}</h3>
                      <Badge variant={statusVariant[b.status] || "secondary"} className="text-[9px] py-0 capitalize">
                        {b.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Resource: <span className="font-medium text-foreground">{b.resourceName}</span></p>
                    <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Users className="h-3.5 w-3.5" /> Booked by: {b.bookedByName} {b.bookedByLastName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> 
                        {new Date(b.startTime).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })} to {new Date(b.endTime).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                  </div>

                  {/* Cancel Booking Action */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/20 hover:bg-destructive/10 shrink-0 text-xs py-1 h-8"
                    onClick={() => handleCancel(b.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                </CardContent>
              </Card>
            ))}

            {filteredBookings.length === 0 && (
              <EmptyState
                icon={<Inbox className="h-12 w-12" />}
                title="No active bookings found"
                description="Make a request above or select a different resource filter."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}