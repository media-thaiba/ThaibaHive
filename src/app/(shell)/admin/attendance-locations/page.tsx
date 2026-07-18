"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import VerificationSettingsForm from "./verification-settings-form";

type Location = {
  id: string;
  name: string;
  institutionId: string | null;
  institutionName: string | null;
  nfcTagId: string | null;
  qrSecret: string;
  isActive: boolean;
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
  accuracy: number | null;
  wifiSsids: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Institution = { id: string; name: string };

export default function AttendanceLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrLocation, setQrLocation] = useState<Location | null>(null);
  const [qrData, setQrData] = useState<string>("");
  const [form, setForm] = useState({
    name: "", institutionId: "", nfcTagId: "", qrSecret: "",
    latitude: "", longitude: "", radius: "", accuracy: "", wifiSsids: "",
  });
  const [saving, setSaving] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [activeTab, setActiveTab] = useState<"locations" | "settings">("locations");
  const [userRole, setUserRole] = useState<string>("staff");
  const [userInstitutionId, setUserInstitutionId] = useState<string | undefined>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLocations = useCallback(async () => {
    const url = showDeleted
      ? "/api/admin/attendance-locations?showDeleted=true"
      : "/api/admin/attendance-locations";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setLocations(data.locations);
    }
    setLoading(false);
  }, [showDeleted]);

  useEffect(() => {
    fetchLocations();
    fetch("/api/admin/institutions")
      .then((r) => r.json())
      .then((data) => setInstitutions(data.institutions || []));
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUserRole(data.user.role);
          setUserInstitutionId(data.user.institutionId);
        }
      })
      .catch(() => {});
  }, [fetchLocations]);

  async function handleCreate() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/attendance-locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        institutionId: form.institutionId || null,
        nfcTagId: form.nfcTagId || null,
        qrSecret: form.qrSecret || undefined,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        radius: form.radius ? parseFloat(form.radius) : null,
        accuracy: form.accuracy ? parseFloat(form.accuracy) : null,
        wifiSsids: form.wifiSsids || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to create location");
      return;
    }
    toast.success("Location created");
    setAddOpen(false);
    setForm({
      name: "", institutionId: "", nfcTagId: "", qrSecret: "",
      latitude: "", longitude: "", radius: "", accuracy: "", wifiSsids: "",
    });
    fetchLocations();
  }

  async function toggleActive(loc: Location) {
    const res = await fetch(`/api/admin/attendance-locations/${loc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !loc.isActive }),
    });
    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }
    fetchLocations();
  }

  async function restoreLocation(loc: Location) {
    const res = await fetch(`/api/admin/attendance-locations/${loc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deletedAt: null }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to restore");
      return;
    }
    toast.success("Location restored");
    fetchLocations();
  }

  async function deleteLocation(loc: Location) {
    if (!confirm(`Delete "${loc.name}"? This will soft-delete the checkpoint.`)) return;
    const res = await fetch(`/api/admin/attendance-locations/${loc.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to delete");
      return;
    }
    toast.success("Location deleted");
    fetchLocations();
  }

  function openQR(loc: Location) {
    setQrLocation(loc);
    setQrOpen(true);
    fetchQR(loc.id);
  }

  async function fetchQR(locationId: string) {
    const res = await fetch(`/api/admin/attendance-locations/${locationId}/qr`);
    if (!res.ok) {
      toast.error("Failed to generate QR");
      return;
    }
    const data = await res.json();
    setQrData(data.qr);
  }

  useEffect(() => {
    if (qrOpen && qrLocation) {
      qrIntervalRef.current = setInterval(() => {
        fetchQR(qrLocation.id);
      }, 30000);
    }
    return () => {
      if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
    };
  }, [qrOpen, qrLocation]);

  useEffect(() => {
    if (!qrData || !canvasRef.current) return;
    drawQR(canvasRef.current, qrData);
  }, [qrData]);

  function handleCloseQR() {
    setQrOpen(false);
    setQrLocation(null);
    setQrData("");
    if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
  }

  function printQR() {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const w = window.open("");
    if (w) {
      w.document.write(`<img src="${dataUrl}" style="max-width:100%" />`);
      w.document.close();
      w.print();
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-2 w-1/3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Attendance Management</h1>
      </div>

      <div className="mb-4 flex gap-2 border-b">
        <Button
          variant={activeTab === "locations" ? "default" : "ghost"}
          onClick={() => setActiveTab("locations")}
          className="rounded-b-none"
        >
          Locations
        </Button>
        <Button
          variant={activeTab === "settings" ? "default" : "ghost"}
          onClick={() => setActiveTab("settings")}
          className="rounded-b-none"
        >
          Verification Settings
        </Button>
      </div>

      {activeTab === "locations" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => setShowDeleted(e.target.checked)}
                  className="rounded"
                />
                Show Deleted
              </label>
              <Button onClick={() => setAddOpen(true)}>Add Location</Button>
            </div>
          </div>

          {locations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No attendance locations configured yet. Add a checkpoint to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {locations.map((loc) => (
                <Card key={loc.id} className={loc.deletedAt ? "opacity-60" : ""}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{loc.name}</p>
                        {loc.deletedAt ? (
                          <Badge variant="destructive">Deleted</Badge>
                        ) : (
                          <Badge variant={loc.isActive ? "success" : "secondary"}>
                            {loc.isActive ? "Active" : "Inactive"}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {loc.institutionName && <span>{loc.institutionName}</span>}
                        {loc.nfcTagId && <span>NFC: {loc.nfcTagId}</span>}
                        {loc.latitude !== null && loc.longitude !== null && (
                          <span>Geofence: {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)} ({loc.radius ?? 100}m)</span>
                        )}
                        {loc.accuracy !== null && (
                          <span>Accuracy: ≤{loc.accuracy}m</span>
                        )}
                        {loc.wifiSsids && (
                          <span>WiFi: {loc.wifiSsids}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {loc.deletedAt ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restoreLocation(loc)}
                        >
                          Restore
                        </Button>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => openQR(loc)}>
                            QR Code
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(loc)}
                          >
                            {loc.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteLocation(loc)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "settings" && (
        <div>
          <VerificationSettingsForm
            userRole={userRole}
            userInstitutionId={userInstitutionId}
          />
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Attendance Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Main Entrance - Gate A"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Institution</label>
              <Select
                value={form.institutionId}
                onChange={(e) => setForm({ ...form, institutionId: e.target.value })}
              >
                <option value="">None</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">NFC Tag ID</label>
              <Input
                value={form.nfcTagId}
                onChange={(e) => setForm({ ...form, nfcTagId: e.target.value })}
                placeholder="Tag UID from stationary reader"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Latitude (Optional)</label>
                <Input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  placeholder="e.g. 11.2588"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Longitude (Optional)</label>
                <Input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  placeholder="e.g. 75.7804"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Radius (Meters)</label>
                <Input
                  type="number"
                  value={form.radius}
                  onChange={(e) => setForm({ ...form, radius: e.target.value })}
                  placeholder="e.g. 100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">GPS Accuracy Limit (m)</label>
                <Input
                  type="number"
                  value={form.accuracy}
                  onChange={(e) => setForm({ ...form, accuracy: e.target.value })}
                  placeholder="e.g. 15"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Allowed WiFi SSIDs (comma-separated)</label>
              <Input
                value={form.wifiSsids}
                onChange={(e) => setForm({ ...form, wifiSsids: e.target.value })}
                placeholder="e.g. Office-WiFi, Guest-Network"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">QR Secret</label>
              <Input
                value={form.qrSecret}
                onChange={(e) => setForm({ ...form, qrSecret: e.target.value })}
                placeholder="Leave blank to auto-generate"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qrOpen} onOpenChange={(v) => { if (!v) handleCloseQR(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code — {qrLocation?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <canvas
              ref={canvasRef}
              width={256}
              height={256}
              className="rounded-md border"
            />
            <p className="text-xs text-muted-foreground text-center">
              Rotates every 30 seconds. Scan with the ThaibaHive mobile app.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={printQR}>
              Print
            </Button>
            <Button variant="outline" onClick={() => qrLocation && fetchQR(qrLocation.id)}>
              Refresh Now
            </Button>
            <Button variant="outline" onClick={handleCloseQR}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function drawQR(canvas: HTMLCanvasElement, data: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = canvas.width;
  const moduleCount = 25;
  const moduleSize = size / moduleCount;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000000";

  const hash = simpleHash(data);
  const bits = dataToBits(data, moduleCount * moduleCount);

  for (let y = 0; y < moduleCount; y++) {
    for (let x = 0; x < moduleCount; x++) {
      const idx = y * moduleCount + x;
      if (isFinderPattern(x, y, moduleCount) || bits[idx % bits.length]) {
        ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
      }
    }
  }
}

function isFinderPattern(x: number, y: number, size: number) {
  const patterns = [
    [0, 0], [size - 7, 0], [0, size - 7],
  ];
  for (const [px, py] of patterns) {
    if (x >= px && x < px + 7 && y >= py && y < py + 7) {
      if (x === px || x === px + 6 || y === py || y === py + 6) return true;
      if (x >= px + 2 && x <= px + 4 && y >= py + 2 && y <= py + 4) return true;
    }
  }
  return false;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function dataToBits(data: string, length: number): boolean[] {
  const bits: boolean[] = [];
  for (let i = 0; i < data.length && bits.length < length; i++) {
    const charCode = data.charCodeAt(i);
    for (let bit = 7; bit >= 0 && bits.length < length; bit--) {
      bits.push((charCode >> bit) & 1 ? true : false);
    }
  }
  while (bits.length < length) bits.push(false);
  return bits;
}
