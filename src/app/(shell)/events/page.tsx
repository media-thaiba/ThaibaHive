"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  Info,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle
} from "lucide-react";

type Event = {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  maxAttendees: number | null;
  createdById: string;
  createdByName: string;
  createdByLastName: string;
  isActive: boolean;
  myRsvpStatus?: string | null;
  attendingCount?: number;
  maybeCount?: number;
  declinedCount?: number;
};

type Department = { id: string; name: string };
type Institution = { id: string; name: string };
type Permissions = { role: string; permissions: string[] };

const priorityVariant: Record<string, "success" | "warning" | "destructive" | "secondary" | "info" | "default"> = {
  holiday: "success",
  institution: "info",
  meeting: "warning",
  department: "secondary",
  other: "default",
};

const rsvpStyles: Record<string, { icon: React.ReactNode; color: string; border: string }> = {
  attending: {
    icon: <CheckCircle className="h-3.5 w-3.5 mr-1" />,
    color: "bg-success/15 text-success",
    border: "border-success/20",
  },
  maybe: {
    icon: <Clock className="h-3.5 w-3.5 mr-1" />,
    color: "bg-warning/15 text-warning",
    border: "border-warning/20",
  },
  declined: {
    icon: <XCircle className="h-3.5 w-3.5 mr-1" />,
    color: "bg-destructive/15 text-destructive",
    border: "border-destructive/20",
  },
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    eventType: "institution",
    startDate: "",
    endDate: "",
    location: "",
    departmentId: "",
    institutionId: "",
    maxAttendees: "",
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [permissions, setPermissions] = useState<Permissions | null>(null);

  const [activeTab, setActiveTab] = useState<"list" | "calendar">("list");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const canCreate = permissions?.role === "super_admin" || (permissions?.permissions.includes("events:create") ?? false);
  const canManage = permissions?.role === "super_admin" || (permissions?.permissions.includes("events:manage") ?? false);
  const isAdmin = canManage || canCreate;

  const fetchData = useCallback(async () => {
    try {
      const [eventsData, deptsData, instsData, permsData] = await Promise.all([
        fetch("/api/events").then((r) => r.json()),
        fetch("/api/departments").then((r) => r.json()).catch(() => ({ departments: [] })),
        fetch("/api/institutions").then((r) => r.json()).catch(() => ({ institutions: [] })),
        fetch("/api/auth/permissions").then((r) => r.json()).catch(() => ({ permissions: [], role: "" })),
      ]);

      setEvents(Array.isArray(eventsData.events) ? eventsData.events : []);
      setDepartments(Array.isArray(deptsData.departments) ? deptsData.departments : []);
      setInstitutions(Array.isArray(instsData.institutions) ? instsData.institutions : []);
      if (permsData.role) setPermissions(permsData);
    } catch {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      ...form,
      maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees) : undefined,
      departmentId: form.departmentId || undefined,
      institutionId: form.institutionId || undefined,
      endDate: form.endDate || undefined,
      description: form.description || undefined,
      location: form.location || undefined,
    };

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowForm(false);
        setForm({
          title: "",
          description: "",
          eventType: "institution",
          startDate: "",
          endDate: "",
          location: "",
          departmentId: "",
          institutionId: "",
          maxAttendees: "",
        });
        toast.success("Event created successfully");
        fetchData();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to create event");
      }
    } catch {
      toast.error("Failed to submit event request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRsvp = async (eventId: string, status: string) => {
    try {
      const res = await fetch("/api/events/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, status }),
      });

      if (res.ok) {
        toast.success(`RSVP updated: ${status}`);
        fetchData();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to submit RSVP");
      }
    } catch {
      toast.error("Failed to submit RSVP request");
    }
  };

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Padding from prev month
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Padding to complete grid of 42 (6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const getLocalDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const daysGrid = getDaysInMonth(currentDate);
  const calendarEventsMap = events.reduce((acc, ev) => {
    const start = ev.startDate;
    const end = ev.endDate || ev.startDate;

    daysGrid.forEach((day) => {
      const dStr = getLocalDateStr(day.date);
      if (dStr >= start && dStr <= end) {
        if (!acc[dStr]) acc[dStr] = [];
        acc[dStr].push(ev);
      }
    });

    return acc;
  }, {} as Record<string, Event[]>);

  const selectedDayEvents = selectedDay ? (calendarEventsMap[selectedDay] || []) : [];

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events Calendar</h1>
        {isAdmin && (
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "New Event"}
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Create Event</CardTitle>
            <p className="text-sm text-muted-foreground">Fill out metadata to create and target this event.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Event title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <Textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={form.eventType}
                  onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                  required
                >
                  <option value="institution">Institution</option>
                  <option value="department">Department</option>
                  <option value="meeting">Meeting</option>
                  <option value="holiday">Holiday</option>
                  <option value="other">Other</option>
                </Select>
                <Input
                  placeholder="Location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>

              {form.eventType === "department" && (
                <Select
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  required
                >
                  <option value="">Select target department...</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </Select>
              )}

              {form.eventType === "institution" && (
                <Select
                  value={form.institutionId}
                  onChange={(e) => setForm({ ...form, institutionId: e.target.value })}
                  required
                >
                  <option value="">Select target institution...</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </Select>
              )}

              {form.eventType === "meeting" && (
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </Select>
                  <Select
                    value={form.institutionId}
                    onChange={(e) => setForm({ ...form, institutionId: e.target.value })}
                  >
                    <option value="">All Institutions</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">End Date (Optional)</label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="w-1/2">
                <label className="text-xs text-muted-foreground">Max Attendees (Optional)</label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={form.maxAttendees}
                  onChange={(e) => setForm({ ...form, maxAttendees: e.target.value })}
                />
              </div>

              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Event"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex border-b">
        <Button
          variant="ghost"
          onClick={() => setActiveTab("list")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "list"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ListIcon className="h-4 w-4" />
          List View
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "calendar"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarIcon className="h-4 w-4" />
          Calendar View
        </Button>
      </div>

      {activeTab === "list" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => {
            const hasStatus = ev.myRsvpStatus && rsvpStyles[ev.myRsvpStatus];
            return (
              <Card key={ev.id} className="flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{ev.title}</CardTitle>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant={priorityVariant[ev.eventType] || "default"} className="text-[10px] capitalize">
                          {ev.eventType}
                        </Badge>
                        {hasStatus && (
                          <Badge className={`text-[10px] capitalize border ${rsvpStyles[ev.myRsvpStatus!].color} ${rsvpStyles[ev.myRsvpStatus!].border}`}>
                            <span className="flex items-center">
                              {rsvpStyles[ev.myRsvpStatus!].icon}
                              {ev.myRsvpStatus}
                            </span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {ev.description && <p className="text-sm text-muted-foreground">{ev.description}</p>}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="flex items-center gap-1.5">
                      📅 {ev.startDate}{ev.endDate ? ` → ${ev.endDate}` : ""}
                    </p>
                    {ev.location && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {ev.location}
                      </p>
                    )}
                    {isAdmin && (
                      <p className="flex items-center gap-1.5 text-foreground font-medium pt-1">
                        <Users className="h-3.5 w-3.5" />
                        RSVPs: Attending ({ev.attendingCount ?? 0}) &middot; Maybe ({ev.maybeCount ?? 0}) &middot; Declined ({ev.declinedCount ?? 0})
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1.5 pt-2 border-t mt-auto">
                    {["attending", "maybe", "declined"].map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={ev.myRsvpStatus === s ? "default" : "outline"}
                        onClick={() => handleRsvp(ev.id, s)}
                        className="text-[10px] capitalize flex-1"
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {events.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground py-8 text-center">No events found.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          {/* Monthly Grid */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold capitalize">
                {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
              </h2>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-1">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {daysGrid.map((day, idx) => {
                const dayStr = getLocalDateStr(day.date);
                const isSelected = selectedDay === dayStr;
                const dayEvents = calendarEventsMap[dayStr] || [];
                const isToday = getLocalDateStr(new Date()) === dayStr;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDay(dayStr)}
                    className={`min-h-[70px] border rounded p-1 flex flex-col justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "hover:bg-muted/30 border-muted"
                    } ${!day.isCurrentMonth ? "opacity-40" : ""}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        isToday ? "bg-primary text-primary-foreground" : ""
                      }`}>
                        {day.date.getDate()}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[9px] font-bold bg-muted px-1.5 py-0.2 rounded-full">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>
                    {dayEvents.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-1 overflow-hidden max-h-[40px]">
                        {dayEvents.slice(0, 3).map((e) => (
                          <div
                            key={e.id}
                            className={`w-full text-[9px] truncate px-1 rounded ${
                              e.eventType === "holiday"
                                ? "bg-success/20 text-success-foreground border-success/30"
                                : e.eventType === "meeting"
                                ? "bg-warning/20 text-warning-foreground border-warning/30"
                                : "bg-primary/10 text-primary border-primary/20"
                            } border`}
                            title={e.title}
                          >
                            {e.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[8px] text-muted-foreground pl-1">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Details Sidebar */}
          <Card className="p-4 flex flex-col justify-between min-h-[300px]">
            <div>
              <h3 className="font-bold border-b pb-2 mb-3">
                {selectedDay ? `Events on ${selectedDay}` : "Select a day"}
              </h3>
              {selectedDayEvents.length > 0 ? (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {selectedDayEvents.map((ev) => (
                    <div key={ev.id} className="border rounded p-2.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{ev.title}</span>
                        <Badge variant={priorityVariant[ev.eventType] || "default"} className="text-[9px] capitalize px-1 py-0 scale-95">
                          {ev.eventType}
                        </Badge>
                      </div>
                      {ev.description && <p className="text-muted-foreground">{ev.description}</p>}
                      {ev.location && <p className="text-muted-foreground flex items-center gap-1">📍 {ev.location}</p>}

                      <div className="flex gap-1 pt-1.5 border-t">
                        {["attending", "maybe", "declined"].map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant={ev.myRsvpStatus === s ? "default" : "outline"}
                            onClick={() => handleRsvp(ev.id, s)}
                            className="text-[9px] capitalize flex-1 h-6 px-1"
                          >
                            {s}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
                  <Info className="h-6 w-6 opacity-60" />
                  {selectedDay ? "No events scheduled for this day." : "Click a date on the calendar grid to check schedules."}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
