"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ScheduleItemForm {
  subjectName: string;
  examDate: string;
  startTime: string;
  endTime: string;
  maxMarks: number;
  passMarks: number;
  roomNumber: string;
}

interface SubjectScheduleFormProps {
  schedules: ScheduleItemForm[];
  onAddSchedule: (schedule: ScheduleItemForm) => void;
  onRemoveSchedule: (index: number) => void;
}

export function SubjectScheduleForm({
  schedules,
  onAddSchedule,
  onRemoveSchedule,
}: SubjectScheduleFormProps) {
  const [subjectName, setSubjectName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("09:30");
  const [endTime, setEndTime] = useState("12:30");
  const [maxMarks, setMaxMarks] = useState(100);
  const [passMarks, setPassMarks] = useState(40);
  const [roomNumber, setRoomNumber] = useState("Hall 101");

  const handleAdd = () => {
    if (!subjectName.trim() || !examDate) {
      alert("Please provide subject name and exam date");
      return;
    }

    onAddSchedule({
      subjectName,
      examDate,
      startTime,
      endTime,
      maxMarks,
      passMarks,
      roomNumber,
    });

    setSubjectName("");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 border rounded-lg bg-muted/20">
        <div>
          <label className="text-xs font-medium text-foreground">Subject Name</label>
          <Input
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="e.g. Mathematics"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">Exam Date</label>
          <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">Room / Venue</label>
          <Input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">Start Time</label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">End Time</label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button onClick={handleAdd} className="w-full">
            + Add Subject Slot
          </Button>
        </div>
      </div>

      {/* List of Added Schedules */}
      {schedules.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase">Scheduled Subjects ({schedules.length})</div>
          <div className="divide-y border rounded-lg overflow-hidden bg-card">
            {schedules.map((s, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between hover:bg-muted/30 text-sm">
                <div>
                  <div className="font-semibold text-foreground">{s.subjectName}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.examDate} | {s.startTime} - {s.endTime} | Venue: {s.roomNumber}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-right">
                    <div>Max: {s.maxMarks}</div>
                    <div className="text-muted-foreground">Pass: {s.passMarks}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onRemoveSchedule(idx)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
