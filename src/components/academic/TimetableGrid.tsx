"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Plus, User, MapPin, ArrowRightLeft } from "lucide-react";

export interface TimetableSlot {
  id: string;
  name: string;
  slotOrder: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

export interface TimetableEntryItem {
  id: string;
  institutionId: string;
  academicYearId?: string | null;
  classId: string;
  className?: string | null;
  slotId: string;
  slotName?: string | null;
  slotStartTime?: string | null;
  slotEndTime?: string | null;
  isBreak?: boolean | null;
  dayOfWeek: number;
  subjectName: string;
  teacherId?: string | null;
  teacherFirstName?: string | null;
  teacherLastName?: string | null;
  roomNumber?: string | null;
}

interface TimetableGridProps {
  slots: TimetableSlot[];
  entries: TimetableEntryItem[];
  canManage?: boolean;
  onSelectSlot?: (dayOfWeek: number, slot: TimetableSlot, existingEntry?: TimetableEntryItem) => void;
  onRequestSubstitution?: (entry: TimetableEntryItem) => void;
}

const DAYS = [
  { day: 1, name: "Monday", short: "Mon" },
  { day: 2, name: "Tuesday", short: "Tue" },
  { day: 3, name: "Wednesday", short: "Wed" },
  { day: 4, name: "Thursday", short: "Thu" },
  { day: 5, name: "Friday", short: "Fri" },
  { day: 6, name: "Saturday", short: "Sat" },
];

export function TimetableGrid({
  slots,
  entries,
  canManage = true,
  onSelectSlot,
  onRequestSubstitution,
}: TimetableGridProps) {
  // Sort slots by order
  const sortedSlots = [...slots].sort((a, b) => a.slotOrder - b.slotOrder);

  // Map entries by key: `${dayOfWeek}_${slotId}`
  const entryMap = new Map<string, TimetableEntryItem>();
  entries.forEach((e) => {
    entryMap.set(`${e.dayOfWeek}_${e.slotId}`, e);
  });

  if (slots.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Clock className="mx-auto h-12 w-12 opacity-40 mb-3" />
          <p className="text-lg font-medium text-foreground">No timetable slots defined</p>
          <p className="text-sm mt-1">Configure period time slots for this institution to build the weekly schedule.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-muted/60 border-b">
            <th className="p-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider w-28 border-r">
              Day / Period
            </th>
            {sortedSlots.map((slot) => (
              <th
                key={slot.id}
                className={`p-3 text-center border-r last:border-r-0 min-w-[150px] ${
                  slot.isBreak ? "bg-amber-50/50 dark:bg-amber-950/20" : ""
                }`}
              >
                <div className="font-semibold text-sm text-foreground">{slot.name}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {slot.startTime} - {slot.endTime}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {DAYS.map(({ day, name, short }) => (
            <tr key={day} className="hover:bg-muted/30 transition-colors">
              <td className="p-3 font-medium bg-muted/20 border-r text-foreground">
                <span className="hidden md:inline">{name}</span>
                <span className="md:hidden">{short}</span>
              </td>
              {sortedSlots.map((slot) => {
                if (slot.isBreak) {
                  return (
                    <td
                      key={slot.id}
                      className="p-2 border-r last:border-r-0 bg-amber-50/30 dark:bg-amber-950/10 text-center text-xs font-medium text-amber-700 dark:text-amber-400"
                    >
                      {slot.name}
                    </td>
                  );
                }

                const entry = entryMap.get(`${day}_${slot.id}`);

                return (
                  <td
                    key={slot.id}
                    className="p-2 border-r last:border-r-0 align-top relative group min-h-[90px]"
                  >
                    {entry ? (
                      <div className="rounded-md border bg-background/80 p-2.5 shadow-sm space-y-1.5 hover:border-primary/50 transition-colors">
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-semibold text-foreground text-sm line-clamp-1">
                            {entry.subjectName}
                          </span>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => onSelectSlot?.(day, slot, entry)}
                            >
                              ✏️
                            </Button>
                          )}
                        </div>

                        {(entry.teacherFirstName || entry.teacherLastName) && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {entry.teacherFirstName} {entry.teacherLastName}
                            </span>
                          </div>
                        )}

                        {entry.roomNumber && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>Room {entry.roomNumber}</span>
                          </div>
                        )}

                        {onRequestSubstitution && (
                          <button
                            type="button"
                            onClick={() => onRequestSubstitution(entry)}
                            className="mt-1 flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                          >
                            <ArrowRightLeft className="h-2.5 w-2.5" />
                            Substitute
                          </button>
                        )}
                      </div>
                    ) : (
                      canManage && (
                        <button
                          type="button"
                          onClick={() => onSelectSlot?.(day, slot)}
                          className="w-full h-full min-h-[70px] rounded border border-dashed border-muted-foreground/20 hover:border-primary/60 hover:bg-primary/5 transition-all flex flex-col items-center justify-center text-xs text-muted-foreground/60 hover:text-primary gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Assign</span>
                        </button>
                      )
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
