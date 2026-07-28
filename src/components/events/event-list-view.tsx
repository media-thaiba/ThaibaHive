"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Users, CheckCircle, Clock, XCircle } from "lucide-react";

type Event = {
  id: string; title: string; description: string | null; eventType: string;
  startDate: string; endDate: string | null; location: string | null;
  myRsvpStatus?: string | null; attendingCount?: number; maybeCount?: number; declinedCount?: number;
};

const priorityVariant: Record<string, "success" | "warning" | "destructive" | "secondary" | "info" | "default"> = {
  holiday: "success", institution: "info", meeting: "warning", department: "secondary", other: "default",
};

const rsvpStyles: Record<string, { icon: React.ReactNode; color: string; border: string }> = {
  attending: { icon: <CheckCircle className="h-3.5 w-3.5 mr-1" />, color: "bg-success/15 text-success", border: "border-success/20" },
  maybe: { icon: <Clock className="h-3.5 w-3.5 mr-1" />, color: "bg-warning/15 text-warning", border: "border-warning/20" },
  declined: { icon: <XCircle className="h-3.5 w-3.5 mr-1" />, color: "bg-destructive/15 text-destructive", border: "border-destructive/20" },
};

type Props = {
  events: Event[];
  isAdmin: boolean;
  onRsvp: (eventId: string, status: string) => void;
};

export function EventListView({ events, isAdmin, onRsvp }: Props) {
  return (
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
                    <Badge variant={priorityVariant[ev.eventType] || "default"} className="text-[10px] capitalize">{ev.eventType}</Badge>
                    {hasStatus && (
                      <Badge className={`text-[10px] capitalize border ${rsvpStyles[ev.myRsvpStatus!].color} ${rsvpStyles[ev.myRsvpStatus!].border}`}>
                        <span className="flex items-center">{rsvpStyles[ev.myRsvpStatus!].icon}{ev.myRsvpStatus}</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {ev.description && <p className="text-sm text-muted-foreground">{ev.description}</p>}
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="flex items-center gap-1.5">📅 {ev.startDate}{ev.endDate ? ` → ${ev.endDate}` : ""}</p>
                {ev.location && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{ev.location}</p>}
                {isAdmin && (
                  <p className="flex items-center gap-1.5 text-foreground font-medium pt-1">
                    <Users className="h-3.5 w-3.5" />
                    RSVPs: Attending ({ev.attendingCount ?? 0}) &middot; Maybe ({ev.maybeCount ?? 0}) &middot; Declined ({ev.declinedCount ?? 0})
                  </p>
                )}
              </div>
              <div className="flex gap-1.5 pt-2 border-t mt-auto">
                {["attending", "maybe", "declined"].map((s) => (
                  <Button key={s} size="sm" variant={ev.myRsvpStatus === s ? "default" : "outline"} onClick={() => onRsvp(ev.id, s)} className="text-[10px] capitalize flex-1">
                    {s}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
      {events.length === 0 && <p className="col-span-full text-sm text-muted-foreground py-8 text-center">No events found.</p>}
    </div>
  );
}
