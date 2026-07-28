"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";

type Event = {
  id: string; title: string; description: string | null; eventType: string;
  startDate: string; endDate: string | null; location: string | null;
  myRsvpStatus?: string | null;
};

const priorityVariant: Record<string, "success" | "warning" | "destructive" | "secondary" | "info" | "default"> = {
  holiday: "success", institution: "info", meeting: "warning", department: "secondary", other: "default",
};

function getLocalDateStr(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDaysInMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const days = [];
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) days.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false });
  for (let i = 1; i <= totalDays; i++) days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  return days;
}

type Props = {
  events: Event[];
  onRsvp: (eventId: string, status: string) => void;
};

export function EventCalendarView({ events, onRsvp }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold capitalize">
            {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
          </h2>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {daysGrid.map((day, idx) => {
            const dayStr = getLocalDateStr(day.date);
            const isSelected = selectedDay === dayStr;
            const dayEvents = calendarEventsMap[dayStr] || [];
            const isToday = getLocalDateStr(new Date()) === dayStr;
            return (
              <div key={idx} onClick={() => setSelectedDay(dayStr)} className={`min-h-[70px] border rounded p-1 flex flex-col justify-between cursor-pointer transition-all ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/30 border-muted"} ${!day.isCurrentMonth ? "opacity-40" : ""}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${isToday ? "bg-primary text-primary-foreground" : ""}`}>{day.date.getDate()}</span>
                  {dayEvents.length > 0 && <span className="text-[9px] font-bold bg-muted px-1.5 py-0.2 rounded-full">{dayEvents.length}</span>}
                </div>
                {dayEvents.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1 overflow-hidden max-h-[40px]">
                    {dayEvents.slice(0, 3).map((e) => (
                      <div key={e.id} className={`w-full text-[9px] truncate px-1 rounded ${e.eventType === "holiday" ? "bg-success/20 text-success-foreground border-success/30" : e.eventType === "meeting" ? "bg-warning/20 text-warning-foreground border-warning/30" : "bg-primary/10 text-primary border-primary/20"} border`} title={e.title}>{e.title}</div>
                    ))}
                    {dayEvents.length > 3 && <div className="text-[8px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 flex flex-col justify-between min-h-[300px]">
        <div>
          <h3 className="font-bold border-b pb-2 mb-3">{selectedDay ? `Events on ${selectedDay}` : "Select a day"}</h3>
          {selectedDayEvents.length > 0 ? (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {selectedDayEvents.map((ev) => (
                <div key={ev.id} className="border rounded p-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{ev.title}</span>
                    <Badge variant={priorityVariant[ev.eventType] || "default"} className="text-[9px] capitalize px-1 py-0 scale-95">{ev.eventType}</Badge>
                  </div>
                  {ev.description && <p className="text-muted-foreground">{ev.description}</p>}
                  {ev.location && <p className="text-muted-foreground flex items-center gap-1">📍 {ev.location}</p>}
                  <div className="flex gap-1 pt-1.5 border-t">
                    {["attending", "maybe", "declined"].map((s) => (
                      <Button key={s} size="sm" variant={ev.myRsvpStatus === s ? "default" : "outline"} onClick={() => onRsvp(ev.id, s)} className="text-[9px] capitalize flex-1 h-6 px-1">{s}</Button>
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
  );
}
