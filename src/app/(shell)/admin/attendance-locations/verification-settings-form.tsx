"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type Institution = { id: string; name: string };

type VerificationSettings = {
  id: string | null;
  institutionId: string | null;
  isEnabled: boolean;
  shadowMode: boolean;
  checkIntervalMinutes: number;
  gracePeriodMinutes: number;
  autoCheckoutOnViolation: boolean;
  geofenceRadiusMeters: number;
  lowBatteryIntervalMinutes: number;
  criticalBatterySuspend: boolean;
};

const DEFAULT_SETTINGS: VerificationSettings = {
  id: null,
  institutionId: null,
  isEnabled: true,
  shadowMode: true,
  checkIntervalMinutes: 10,
  gracePeriodMinutes: 5,
  autoCheckoutOnViolation: false,
  geofenceRadiusMeters: 150,
  lowBatteryIntervalMinutes: 15,
  criticalBatterySuspend: true,
};

export default function VerificationSettingsForm({
  userRole,
  userInstitutionId,
}: {
  userRole: string;
  userInstitutionId?: string;
}) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>(
    userRole === "principal" ? (userInstitutionId || "") : ""
  );
  const [settings, setSettings] = useState<VerificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isGlobalAdmin = userRole === "super_admin" || userRole === "admin";

  const fetchSettings = useCallback(async (institutionId: string | null) => {
    setLoading(true);
    try {
      const params = institutionId ? `?institutionId=${institutionId}` : "";
      const res = await fetch(`/api/attendance/settings${params}`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      } else {
        toast.error("Failed to load settings");
      }
    } catch {
      toast.error("Failed to load settings");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/admin/institutions")
      .then((r) => r.json())
      .then((data) => {
        const insts = data.institutions || [];
        if (userRole === "principal" && userInstitutionId) {
          setInstitutions(insts.filter((i: Institution) => i.id === userInstitutionId));
        } else {
          setInstitutions(insts);
        }
      })
      .catch(() => {});
  }, [userRole, userInstitutionId]);

  useEffect(() => {
    fetchSettings(selectedInstitutionId || null);
  }, [selectedInstitutionId, fetchSettings]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/attendance/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: selectedInstitutionId || null,
          isEnabled: settings.isEnabled,
          shadowMode: settings.shadowMode,
          checkIntervalMinutes: settings.checkIntervalMinutes,
          gracePeriodMinutes: settings.gracePeriodMinutes,
          autoCheckoutOnViolation: settings.autoCheckoutOnViolation,
          geofenceRadiusMeters: settings.geofenceRadiusMeters,
          lowBatteryIntervalMinutes: settings.lowBatteryIntervalMinutes,
          criticalBatterySuspend: settings.criticalBatterySuspend,
        }),
      });
      if (res.ok) {
        toast.success("Settings saved successfully");
        const data = await res.json();
        setSettings(data.settings);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Presence Verification Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Campus Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {isGlobalAdmin ? "Campus / Institution" : "Your Campus"}
          </label>
          {isGlobalAdmin ? (
            <Select
              value={selectedInstitutionId}
              onChange={(e) => setSelectedInstitutionId(e.target.value)}
            >
              <option value="">Global Settings</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              value={institutions.find((i) => i.id === selectedInstitutionId)?.name || ""}
              disabled
            />
          )}
        </div>

        {/* Boolean Toggles */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Enable Verification</p>
              <p className="text-xs text-muted-foreground">
                Turn on background presence checks
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.isEnabled}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings({ ...settings, isEnabled: e.target.checked })
              }
              className="rounded"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Shadow Mode</p>
              <p className="text-xs text-muted-foreground">
                Log violations without enforcement
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.shadowMode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings({ ...settings, shadowMode: e.target.checked })
              }
              className="rounded"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Auto Checkout on Violation</p>
              <p className="text-xs text-muted-foreground">
                Automatically check out when geofence violated
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoCheckoutOnViolation}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings({ ...settings, autoCheckoutOnViolation: e.target.checked })
              }
              className="rounded"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Suspend on Critical Battery</p>
              <p className="text-xs text-muted-foreground">
                Pause tracking when battery is critical
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.criticalBatterySuspend}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings({ ...settings, criticalBatterySuspend: e.target.checked })
              }
              className="rounded"
            />
          </div>
        </div>

        {/* Numeric Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Check Interval (minutes)</label>
            <Input
              type="number"
              min={1}
              max={180}
              value={settings.checkIntervalMinutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  checkIntervalMinutes: parseInt(e.target.value) || 10,
                })
              }
            />
            <p className="text-xs text-muted-foreground">Between 1 and 180 minutes</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Grace Period (minutes)</label>
            <Input
              type="number"
              min={0}
              max={60}
              value={settings.gracePeriodMinutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  gracePeriodMinutes: parseInt(e.target.value) || 0,
                })
              }
            />
            <p className="text-xs text-muted-foreground">Between 0 and 60 minutes</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Geofence Radius (meters)</label>
            <Input
              type="number"
              min={10}
              max={5000}
              value={settings.geofenceRadiusMeters}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  geofenceRadiusMeters: parseInt(e.target.value) || 150,
                })
              }
            />
            <p className="text-xs text-muted-foreground">Between 10 and 5000 meters</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Low Battery Interval (minutes)</label>
            <Input
              type="number"
              min={1}
              max={180}
              value={settings.lowBatteryIntervalMinutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  lowBatteryIntervalMinutes: parseInt(e.target.value) || 15,
                })
              }
            />
            <p className="text-xs text-muted-foreground">Between 1 and 180 minutes</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
