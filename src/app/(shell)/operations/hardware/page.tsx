"use client";

import { useState, useEffect, useCallback } from "react";
import { DeviceFleetTable, HardwareDeviceItem } from "@/components/hardware/device-fleet-table";
import { GateMonitoringConsole, GateAccessEvent } from "@/components/hardware/gate-monitoring-console";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  Cpu,
  Fingerprint,
  RefreshCw,
} from "lucide-react";

export default function HardwareCommandCenterPage() {
  const [activeTab, setActiveTab] = useState<"fleet" | "gates">("fleet");
  const [devices, setDevices] = useState<HardwareDeviceItem[]>([]);
  const [events, setEvents] = useState<GateAccessEvent[]>([]);
  const [isLockedDown, setIsLockedDown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Devices
      const devRes = await fetch("/api/hardware/devices");
      const devData = await devRes.json().catch(() => ({}));
      if (devRes.ok && devData.devices) {
        setDevices(devData.devices);
      }

      // 2. Fetch Access Control Events
      const eventsRes = await fetch("/api/hardware/access-control/events?limit=50");
      const eventsData = await eventsRes.json().catch(() => ({}));
      if (eventsRes.ok && eventsData.events) {
        setEvents(eventsData.events);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load hardware fleet data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData().catch(() => {});
  }, [fetchData]);

  const handleRegisterDevice = async (newDev: any) => {
    const res = await fetch("/api/hardware/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDev),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to register device");
    }
    await fetchData();
  };

  const handleTriggerOta = async (release: any) => {
    const res = await fetch("/api/hardware/ota/releases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(release),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to stage OTA release");
    }
  };

  const handleLockdownToggle = async (isLocked: boolean, reason?: string) => {
    const res = await fetch("/api/hardware/gates/lockdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isLocked, reason }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to toggle facility lockdown");
    }
    setIsLockedDown(isLocked);
    await fetchData();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-primary" />
            Hardware & IoT Mesh Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edge device fleet management, smart turnstile access control & emergency facility lockdowns
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData().catch(() => {})}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Fleet
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="text-sm">
          {error}
        </Alert>
      )}

      {/* Mode Navigation Tabs */}
      <div className="flex items-center border-b space-x-4">
        <button
          onClick={() => setActiveTab("fleet")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "fleet"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Cpu className="w-4 h-4" />
          IoT Device Fleet ({devices.length})
        </button>

        <button
          onClick={() => setActiveTab("gates")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "gates"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Fingerprint className="w-4 h-4" />
          Smart Gates & Access Control ({events.length})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "fleet" && (
        <DeviceFleetTable
          devices={devices}
          isLoading={isLoading}
          onRefresh={() => fetchData().catch(() => {})}
          onRegisterDevice={handleRegisterDevice}
          onTriggerOta={handleTriggerOta}
        />
      )}

      {activeTab === "gates" && (
        <GateMonitoringConsole
          events={events}
          isLoading={isLoading}
          onRefresh={() => fetchData().catch(() => {})}
          onLockdownToggle={handleLockdownToggle}
          isLockedDown={isLockedDown}
        />
      )}
    </div>
  );
}
