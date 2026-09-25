'use client';

import React from 'react';
import { AlumniChapterItem, AlumniEventItem } from '@/lib/operations/alumni/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ChapterEventsTabProps {
  chapters: AlumniChapterItem[];
  events: AlumniEventItem[];
  onRefresh?: () => void;
}

export function ChapterEventsTab({ chapters, events, onRefresh }: ChapterEventsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-3">Regional & International Chapters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chapters.map((chap) => (
            <Card key={chap.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">{chap.name}</CardTitle>
                    <p className="text-xs text-slate-500">{chap.city}, {chap.country}</p>
                  </div>
                  <Badge variant="info">{chap.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="text-xs text-slate-600 line-clamp-2">{chap.description || 'Active institutional chapter.'}</p>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 font-medium">
                  <span>{chap.memberCount} Members</span>
                  <span className="text-teal-700 font-semibold">{chap.status}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-3">Homecoming Reunions & Events</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((evt) => (
            <Card key={evt.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">{evt.title}</CardTitle>
                    <p className="text-xs text-slate-500 font-medium">
                      {new Date(evt.startDateTime).toLocaleDateString()} • {evt.venue || 'Virtual'}
                    </p>
                  </div>
                  <Badge variant="success">{evt.format}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="text-xs text-slate-600 line-clamp-2">{evt.description}</p>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                  <span>{evt.registeredCount} / {evt.capacity} Registered</span>
                  <span className="font-semibold text-teal-700">
                    {evt.ticketPrice === 0 ? 'Free RSVP' : `₹${evt.ticketPrice}`}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
