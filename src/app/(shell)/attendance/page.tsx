"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type AttendanceLog = {
  id: string; date: string; checkIn: string | null; checkOut: string | null;
  status: string; lateMinutes: number | null; workedMinutes: number | null;
  method: string;
};

export default function AttendancePage() {
  const { staff } = useAuth();
  const [todayLog, setTodayLog] = useState<AttendanceLog | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nfcMode, setNfcMode] = useState(false);
  const [nfcTag, setNfcTag] = useState("");

  useState(() => { fetchAttendance(); });

  async function fetchAttendance() {
    const res = await fetch("/api/attendance/my");
    const data = await res.json();
    setTodayLog(data.todayLog || null);
    setLogs(data.logs || []);
    setLoading(false);
  }

  async function handleCheckIn() {
    setError("");
    const res = await fetch("/api/attendance/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: nfcMode ? "nfc" : "manual",
        nfcTagId: nfcMode ? nfcTag : undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Check-in failed");
      return;
    }

    fetchAttendance();
  }

  async function handleCheckOut() {
    setError("");
    const res = await fetch("/api/attendance/check-out", { method: "POST" });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Check-out failed");
      return;
    }

    fetchAttendance();
  }

  if (loading) return <div className="flex-1 p-6 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="flex-1 p-6">
      <h1 className="mb-6 text-2xl font-bold">Attendance</h1>

      <div className="mb-8 rounded-lg border p-6 text-center">
        <p className="text-sm text-muted-foreground mb-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
        <p className="mb-4 text-lg font-medium">{staff?.firstName} {staff?.lastName}</p>

        {todayLog?.checkIn ? (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Checked in at {new Date(todayLog.checkIn!).toLocaleTimeString()}
            </div>
            {todayLog.checkOut ? (
              <div className="text-sm text-muted-foreground">
                Checked out at {new Date(todayLog.checkOut).toLocaleTimeString()} &middot;
                Worked {Math.round((todayLog.workedMinutes || 0) / 60)}h {(todayLog.workedMinutes || 0) % 60}m
              </div>
            ) : (
              <button
                onClick={handleCheckOut}
                className="rounded-md bg-destructive px-6 py-2 text-sm font-medium text-destructive-foreground"
              >
                Check Out
              </button>
            )}
            {todayLog.status === "late" && (
              <p className="text-xs text-amber-600">Late by {todayLog.lateMinutes} minutes</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleCheckIn}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
            >
              Check In
            </button>

            <div className="flex items-center justify-center gap-2 text-sm">
              <input
                type="checkbox"
                id="nfcMode"
                checked={nfcMode}
                onChange={(e) => setNfcMode(e.target.checked)}
              />
              <label htmlFor="nfcMode">Use NFC/QR tag</label>
            </div>

            {nfcMode && (
              <input
                type="text"
                placeholder="Scan NFC tag or enter tag ID"
                value={nfcTag}
                onChange={(e) => setNfcTag(e.target.value)}
                className="mx-auto block w-64 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            )}
          </div>
        )}

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      <h2 className="mb-3 text-lg font-semibold">Recent Activity</h2>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Check In</th>
              <th className="px-4 py-3 text-left font-medium">Check Out</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Hours</th>
            </tr>
          </thead>
          <tbody>
            {logs.filter((l) => l.date !== todayLog?.date).map((log) => (
              <tr key={log.id} className="border-b last:border-0">
                <td className="px-4 py-3">{log.date}</td>
                <td className="px-4 py-3">{log.checkIn ? new Date(log.checkIn).toLocaleTimeString() : "—"}</td>
                <td className="px-4 py-3">{log.checkOut ? new Date(log.checkOut).toLocaleTimeString() : "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    log.status === "present" ? "bg-green-100 text-green-700" :
                    log.status === "late" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>{log.status}</span>
                </td>
                <td className="px-4 py-3">{log.workedMinutes ? `${Math.round(log.workedMinutes / 60)}h ${log.workedMinutes % 60}m` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
