'use client';

import React, { useState } from 'react';
import { AlumniEventItem } from '@/lib/operations/alumni/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface EventRsvpCardProps {
  event: AlumniEventItem;
  onRsvpSuccess?: () => void;
}

export function EventRsvpCard({ event, onRsvpSuccess }: EventRsvpCardProps) {
  const [registered, setRegistered] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRsvp = async () => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/alumni/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          institutionId: event.institutionId || 'global',
          attendeeName: 'Student / Alumni Member',
          attendeeEmail: 'member@thaiba.edu',
        }),
      });
      const data = await res.json();
      if (data.rsvp?.ticketNumber) {
        setTicketNumber(data.rsvp.ticketNumber);
        setRegistered(true);
      }
      if (onRsvpSuccess) onRsvpSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{event.title}</CardTitle>
            <p className="text-xs text-slate-500">
              {new Date(event.startDateTime).toLocaleDateString()} • {event.venue || 'Virtual Meeting'}
            </p>
          </div>
          <Badge variant="info">{event.format}</Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        <p className="text-xs text-slate-600 line-clamp-2">{event.description}</p>
        <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
          <span>Capacity: {event.registeredCount} / {event.capacity}</span>
          <span className="font-semibold text-teal-700">
            {event.ticketPrice === 0 ? 'Free Entry' : `₹${event.ticketPrice}`}
          </span>
        </div>
        {registered ? (
          <div className="p-2 bg-teal-50 text-teal-800 text-xs rounded border border-teal-200 text-center font-mono">
            Pass Issued: {ticketNumber} (QR in Mobile App)
          </div>
        ) : (
          <Button className="w-full" size="sm" onClick={handleRsvp} disabled={submitting}>
            {submitting ? 'Registering RSVP...' : 'Confirm RSVP / Claim Pass'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
