"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TimetableGrid, TimetableSlot, TimetableEntryItem } from "@/components/academic/TimetableGrid";
import { TeacherSubstitutionModal } from "@/components/academic/TeacherSubstitutionModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Clock, Users, ArrowRightLeft, BookOpen, Check } from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
  section?: string | null;
  institutionId?: string | null;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  designation?: string | null;
}

interface SubstitutionRecord {
  id: string;
  date: string;
  subjectName: string;
  className: string;
  slotName: string;
  originalTeacherName: string;
  substituteTeacherId: string;
  status: string;
  reason?: string | null;
}

export default function TimetablePage() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [entries, setEntries] = useState<TimetableEntryItem[]>([]);
  const [substitutions, setSubstitutions] = useState<SubstitutionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Slot Assignment Dialog state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignDay, setAssignDay] = useState<number>(1);
  const [assignSlot, setAssignSlot] = useState<TimetableSlot | null>(null);
  const [assignSubject, setAssignSubject] = useState("");
  const [assignTeacherId, setAssignTeacherId] = useState("");
  const [assignRoom, setAssignRoom] = useState("");

  // Create New Period Slot Modal state
  const [isNewSlotModalOpen, setIsNewSlotModalOpen] = useState(false);
  const [newSlotName, setNewSlotName] = useState("");
  const [newSlotOrder, setNewSlotOrder] = useState(1);
  const [newSlotStart, setNewSlotStart] = useState("09:00");
  const [newSlotEnd, setNewSlotEnd] = useState("09:45");
  const [newSlotIsBreak, setNewSlotIsBreak] = useState(false);

  // Substitution Modal state
  const [selectedEntryForSub, setSelectedEntryForSub] = useState<TimetableEntryItem | null>(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  // Fetch initial classes and staff
  useEffect(() => {
    Promise.all([
      fetch("/api/academic/classes").then((r) => r.json()).catch(() => ({ classes: [] })),
      fetch("/api/staff").then((r) => r.json()).catch(() => ({ staff: [] })),
    ]).then(([classesRes, staffRes]) => {
      const clsList = classesRes.classes || [];
      setClasses(clsList);
      if (clsList.length > 0) {
        setSelectedClassId(clsList[0].id);
      }
      setTeachers(
        (staffRes.staff || []).map((s: { id: string; firstName: string; lastName: string; designation?: string }) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          designation: s.designation,
        }))
      );
    });
  }, []);

  // Fetch timetable slots and entries
  const fetchTimetableData = useCallback(async () => {
    if (!selectedClassId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/academic/timetables?classId=${selectedClassId}`);
      const data = await res.json();
      setSlots(data.slots || []);
      setEntries(data.entries || []);

      // Also fetch substitutions
      const subRes = await fetch("/api/academic/timetables/substitutions");
      const subData = await subRes.json();
      setSubstitutions(subData.substitutions || []);
    } catch {
      setSlots([]);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchTimetableData();
  }, [fetchTimetableData]);

  const handleSlotClick = (dayOfWeek: number, slot: TimetableSlot, existing?: TimetableEntryItem) => {
    setAssignDay(dayOfWeek);
    setAssignSlot(slot);
    setAssignSubject(existing?.subjectName || "");
    setAssignTeacherId(existing?.teacherId || "");
    setAssignRoom(existing?.roomNumber || "");
    setIsAssignModalOpen(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignSlot || !selectedClassId || !assignSubject) return;

    try {
      const res = await fetch("/api/academic/timetables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry: {
            institutionId: "inst_tgcis",
            classId: selectedClassId,
            slotId: assignSlot.id,
            dayOfWeek: assignDay,
            subjectName: assignSubject,
            teacherId: assignTeacherId || null,
            roomNumber: assignRoom || null,
          },
        }),
      });

      if (res.ok) {
        setIsAssignModalOpen(false);
        setNotification("Timetable slot updated successfully.");
        setTimeout(() => setNotification(null), 3000);
        fetchTimetableData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/academic/timetables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_slot",
          slot: {
            institutionId: "inst_tgcis",
            name: newSlotName,
            slotOrder: newSlotOrder,
            startTime: newSlotStart,
            endTime: newSlotEnd,
            isBreak: newSlotIsBreak,
          },
        }),
      });

      if (res.ok) {
        setIsNewSlotModalOpen(false);
        setNewSlotName("");
        setNotification("New period slot configured.");
        setTimeout(() => setNotification(null), 3000);
        fetchTimetableData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openSubstitutionModal = (entry: TimetableEntryItem) => {
    setSelectedEntryForSub(entry);
    setIsSubModalOpen(true);
  };

  const currentClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Academic Timetable & Schedule
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure weekly period slots, assign subject teachers, and manage daily substitutions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsNewSlotModalOpen(true)} className="gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" />
            Configure Period Slots
          </Button>
        </div>
      </div>

      {notification && (
        <Alert variant="info" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
          <Check className="h-4 w-4 shrink-0 inline mr-2" />
          {notification}
        </Alert>
      )}

      {/* Class Selector Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Selected Class / Batch:
            </label>
            <Select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-64 font-medium"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.section ? `(${cls.section})` : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="secondary">{slots.length} Period Slots</Badge>
            <Badge variant="secondary">{entries.length} Assigned Periods</Badge>
            <Badge variant="secondary">{substitutions.length} Active Substitutions</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Timetable Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            Weekly Schedule — {currentClass?.name || "Class"}
          </h2>
          <span className="text-xs text-muted-foreground">Click any cell to assign or edit period</span>
        </div>

        <TimetableGrid
          slots={slots}
          entries={entries}
          canManage={true}
          onSelectSlot={handleSlotClick}
          onRequestSubstitution={openSubstitutionModal}
        />
      </div>

      {/* Teacher Substitution Log */}
      {substitutions.length > 0 && (
        <Card className="mt-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-blue-600" />
              Recent Teacher Substitution Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Class & Subject</th>
                    <th className="p-2.5">Regular Teacher</th>
                    <th className="p-2.5">Substitute Assigned</th>
                    <th className="p-2.5">Reason</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {substitutions.slice(0, 5).map((sub) => {
                    const subTeacher = teachers.find((t) => t.id === sub.substituteTeacherId);
                    return (
                      <tr key={sub.id}>
                        <td className="p-2.5 font-medium">{sub.date}</td>
                        <td className="p-2.5">{sub.className} — {sub.subjectName}</td>
                        <td className="p-2.5 text-muted-foreground">{sub.originalTeacherName || "Staff"}</td>
                        <td className="p-2.5 font-semibold text-primary">
                          {subTeacher ? `${subTeacher.firstName} ${subTeacher.lastName}` : sub.substituteTeacherId}
                        </td>
                        <td className="p-2.5 text-muted-foreground">{sub.reason || "—"}</td>
                        <td className="p-2.5">
                          <Badge variant="info">{sub.status}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Slot Dialog */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Timetable Period</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEntry} className="space-y-4 pt-2">
            <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
              <div><span className="font-semibold">Day:</span> Day {assignDay}</div>
              <div><span className="font-semibold">Period:</span> {assignSlot?.name} ({assignSlot?.startTime} - {assignSlot?.endTime})</div>
              <div><span className="font-semibold">Class:</span> {currentClass?.name}</div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Subject Name</label>
              <Input
                placeholder="e.g. Mathematics, Islamic History, Computer Networks"
                value={assignSubject}
                onChange={(e) => setAssignSubject(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Assigned Teacher</label>
              <Select
                value={assignTeacherId}
                onChange={(e) => setAssignTeacherId(e.target.value)}
              >
                <option value="">-- Select Teacher (Optional) --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName} {t.designation ? `(${t.designation})` : ""}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Room / Lab Number</label>
              <Input
                placeholder="e.g. Room 204, Science Lab A"
                value={assignRoom}
                onChange={(e) => setAssignRoom(e.target.value)}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Period</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Period Slot Dialog */}
      <Dialog open={isNewSlotModalOpen} onOpenChange={setIsNewSlotModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Period Slot</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSlot} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Slot Label</label>
              <Input
                placeholder="e.g. Period 1, Period 2, Lunch Break"
                value={newSlotName}
                onChange={(e) => setNewSlotName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Start Time</label>
                <Input
                  type="time"
                  value={newSlotStart}
                  onChange={(e) => setNewSlotStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">End Time</label>
                <Input
                  type="time"
                  value={newSlotEnd}
                  onChange={(e) => setNewSlotEnd(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Display Order</label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={newSlotOrder}
                  onChange={(e) => setNewSlotOrder(Number(e.target.value))}
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  id="break-checkbox"
                  type="checkbox"
                  checked={newSlotIsBreak}
                  onChange={(e) => setNewSlotIsBreak(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="break-checkbox" className="text-xs font-medium text-foreground cursor-pointer">
                  Is Break / Recess Period
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsNewSlotModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Slot</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Teacher Substitution Modal */}
      <TeacherSubstitutionModal
        open={isSubModalOpen}
        onOpenChange={setIsSubModalOpen}
        entry={selectedEntryForSub}
        teachers={teachers}
        onSuccess={() => {
          setNotification("Teacher substitution recorded successfully.");
          setTimeout(() => setNotification(null), 3000);
          fetchTimetableData();
        }}
      />
    </div>
  );
}
