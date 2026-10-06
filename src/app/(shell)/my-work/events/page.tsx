"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Calendar as CalendarIcon, List as ListIcon } from "lucide-react";
import { EventFormCard } from "@/components/events/event-form-card";
import { EventListView } from "@/components/events/event-list-view";
import { EventCalendarView } from "@/components/events/event-calendar-view";

type Event = {
  id: string; title: string; description: string | null; eventType: string;
  startDate: string; endDate: string | null; location: string | null;
  maxAttendees: number | null; createdById: string; createdByName: string;
  createdByLastName: string; isActive: boolean;
  myRsvpStatus?: string | null; attendingCount?: number; maybeCount?: number; declinedCount?: number;
};

type Department = { id: string; name: string };
type Institution = { id: string; name: string };
type Permissions = { role: string; permissions: string[] };

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [activeTab, setActiveTab] = useState<"list" | "calendar">("list");

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
    } catch { toast.error("Failed to load events"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRsvp = async (eventId: string, status: string) => {
    try {
      const res = await fetch("/api/events/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, status }),
      });
      if (res.ok) { toast.success(`RSVP updated: ${status}`); fetchData(); }
      else { const err = await res.json(); toast.error(err.error || "Failed to submit RSVP"); }
    } catch { toast.error("Failed to submit RSVP request"); }
  };

  if (loading) return <div className="flex-1 p-6"><Skeleton className="h-8 w-48" /></div>;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events Calendar</h1>
        {isAdmin && <Button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "New Event"}</Button>}
      </div>

      {showForm && <EventFormCard departments={departments} institutions={institutions} onCreated={() => { setShowForm(false); fetchData(); }} onCancel={() => setShowForm(false)} />}

      <div className="flex border-b">
        <Button variant="ghost" onClick={() => setActiveTab("list")} className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === "list" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          <ListIcon className="h-4 w-4" /> List View
        </Button>
        <Button variant="ghost" onClick={() => setActiveTab("calendar")} className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === "calendar" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          <CalendarIcon className="h-4 w-4" /> Calendar View
        </Button>
      </div>

      {activeTab === "list" ? (
        <EventListView events={events} isAdmin={isAdmin} onRsvp={handleRsvp} />
      ) : (
        <EventCalendarView events={events} onRsvp={handleRsvp} />
      )}
    </div>
  );
}
