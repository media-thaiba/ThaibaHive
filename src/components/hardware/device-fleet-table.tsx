"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ensureArray } from "@/lib/utils";
import { toast } from "sonner";
import {
  Cpu,
  Battery,
  BatteryWarning,
  Wifi,
  WifiOff,
  Plus,
  Search,
  RefreshCw,
  UploadCloud,
} from "lucide-react";

export interface HardwareDeviceItem {
  id: string;
  name: string;
  type: string;
  model?: string | null;
  firmwareVersion?: string | null;
  macAddress?: string | null;
  status: string;
  batteryLevel?: number | null;
  lastHeartbeatAt?: string | null;
  zoneId?: string | null;
  isActive: boolean;
}

interface DeviceFleetTableProps {
  devices?: HardwareDeviceItem[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onRegisterDevice?: (device: any) => Promise<void>;
  onTriggerOta?: (release: any) => Promise<void>;
}

export function DeviceFleetTable({
  devices = [],
  isLoading = false,
  onRefresh,
  onRegisterDevice,
  onTriggerOta,
}: DeviceFleetTableProps) {
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [showOtaDialog, setShowOtaDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Device Form State
  const [newDevName, setNewDevName] = useState("");
  const [newDevType, setNewDevType] = useState("gate_kiosk");
  const [newDevModel, setNewDevModel] = useState("ZK-Teco-Pro-2026");
  const [newDevMac, setNewDevMac] = useState("");

  // OTA Form State
  const [otaVersion, setOtaVersion] = useState("1.3.0-canary");
  const [otaDeviceType, setOtaDeviceType] = useState("gate_kiosk");
  const [otaBinaryUrl, setOtaBinaryUrl] = useState("https://firmware.thaibahive.internal/v1.3.0.bin");
  const [otaSha256, setOtaSha256] = useState("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

  const safeDevices: HardwareDeviceItem[] = ensureArray(devices);

  const filteredDevices = safeDevices.filter((d) => {
    if (typeFilter !== "all" && d.type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        (d.macAddress ? d.macAddress.toLowerCase().includes(q) : false)
      );
    }
    return true;
  });

  const handleRegisterSubmit = async () => {
    if (!onRegisterDevice) return;
    if (!newDevName || !newDevMac) {
      toast.error("Device name and MAC address are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onRegisterDevice({
        name: newDevName,
        type: newDevType,
        model: newDevModel,
        macAddress: newDevMac,
      });
      setShowRegisterDialog(false);
      setNewDevName("");
      setNewDevMac("");
      toast.success("Hardware device registered successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to register device");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtaSubmit = async () => {
    if (!onTriggerOta) return;
    setIsSubmitting(true);
    try {
      await onTriggerOta({
        version: otaVersion,
        deviceType: otaDeviceType,
        binaryUrl: otaBinaryUrl,
        binarySha256: otaSha256,
        signature: "sig_rsa4096_hardware_trusted_key",
        rolloutStage: "canary_1",
      });
      setShowOtaDialog(false);
      toast.success(`Canary OTA rollout triggered for ${otaDeviceType}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger OTA rollout");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base">IoT & Edge Device Fleet</h3>
            <p className="text-xs text-muted-foreground">
              Fleet telemetry, heartbeat watchdog & firmware OTA rollouts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOtaDialog(true)}
          >
            <UploadCloud className="w-4 h-4 mr-1.5 text-blue-500" />
            Stage OTA
          </Button>

          <Button size="sm" onClick={() => setShowRegisterDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Register Device
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b gap-4 bg-muted/10">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search device name, MAC, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-48 text-xs"
        >
          <SelectItem value="all">All Device Types</SelectItem>
          <SelectItem value="gate_kiosk">Gate Turnstiles</SelectItem>
          <SelectItem value="beacon">BLE Beacons</SelectItem>
          <SelectItem value="nfc_reader">NFC Readers</SelectItem>
          <SelectItem value="biometric_scanner">Biometric Terminals</SelectItem>
          <SelectItem value="patrol_device">Patrol Handhelds</SelectItem>
        </Select>
      </div>

      {/* Device List Table */}
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No devices enrolled in this category.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0 border-b">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Device</th>
                <th className="py-2.5 px-4 font-semibold">Type</th>
                <th className="py-2.5 px-4 font-semibold">Connectivity</th>
                <th className="py-2.5 px-4 font-semibold">Firmware</th>
                <th className="py-2.5 px-4 font-semibold">Battery</th>
                <th className="py-2.5 px-4 font-semibold text-right">Last Heartbeat</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDevices.map((dev) => {
                const isOnline = dev.status === "online";
                const battery = dev.batteryLevel ?? 100;

                return (
                  <tr key={dev.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-sm">{dev.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {dev.macAddress || dev.id}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize px-2 py-0.5 rounded bg-muted font-medium text-[11px]">
                        {dev.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {isOnline ? (
                        <Badge variant="success" className="gap-1">
                          <Wifi className="w-3 h-3" />
                          Online
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-muted-foreground">
                          <WifiOff className="w-3 h-3" />
                          Offline
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      v{dev.firmwareVersion || "1.0.0"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {battery <= 20 ? (
                          <BatteryWarning className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Battery className="w-4 h-4 text-emerald-500" />
                        )}
                        <span className="font-mono text-xs">{battery}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground font-mono">
                      {dev.lastHeartbeatAt
                        ? new Date(dev.lastHeartbeatAt).toLocaleTimeString()
                        : "Never"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Device Registration Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll Hardware Device</DialogTitle>
            <DialogDescription>
              Register a new IoT beacon, gate kiosk, or biometric scanner terminal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div>
              <label className="font-medium mb-1 block">Device Name</label>
              <Input
                placeholder="e.g. Science Wing Turnstile Reader 2"
                value={newDevName}
                onChange={(e) => setNewDevName(e.target.value)}
              />
            </div>

            <div>
              <label className="font-medium mb-1 block">Device Type</label>
              <Select
                value={newDevType}
                onChange={(e) => setNewDevType(e.target.value)}
                className="text-xs"
              >
                <SelectItem value="gate_kiosk">Gate Turnstile Kiosk</SelectItem>
                <SelectItem value="beacon">BLE Spatial Beacon</SelectItem>
                <SelectItem value="nfc_reader">NFC Smart Reader</SelectItem>
                <SelectItem value="biometric_scanner">Biometric Terminal</SelectItem>
                <SelectItem value="patrol_device">Guard Patrol Handheld</SelectItem>
                <SelectItem value="environmental_sensor">Environmental Sensor</SelectItem>
              </Select>
            </div>

            <div>
              <label className="font-medium mb-1 block">Hardware Model</label>
              <Input
                placeholder="e.g. ZK-Teco-Pro-2026"
                value={newDevModel}
                onChange={(e) => setNewDevModel(e.target.value)}
              />
            </div>

            <div>
              <label className="font-medium mb-1 block">MAC Address / UID</label>
              <Input
                placeholder="e.g. AA:BB:CC:11:22:33"
                value={newDevMac}
                onChange={(e) => setNewDevMac(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRegisterDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleRegisterSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Enrolling..." : "Enroll Device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Firmware OTA Rollout Dialog */}
      <Dialog open={showOtaDialog} onOpenChange={setShowOtaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deploy Firmware OTA Release</DialogTitle>
            <DialogDescription>
              Staged canary rollout with dual-bank flash watchdog validation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div>
              <label className="font-medium mb-1 block">Release Version</label>
              <Input
                placeholder="e.g. 1.3.0-canary"
                value={otaVersion}
                onChange={(e) => setOtaVersion(e.target.value)}
              />
            </div>

            <div>
              <label className="font-medium mb-1 block">Target Device Type</label>
              <Select
                value={otaDeviceType}
                onChange={(e) => setOtaDeviceType(e.target.value)}
                className="text-xs"
              >
                <SelectItem value="gate_kiosk">Gate Turnstile Kiosks</SelectItem>
                <SelectItem value="beacon">BLE Spatial Beacons</SelectItem>
                <SelectItem value="nfc_reader">NFC Smart Readers</SelectItem>
                <SelectItem value="biometric_scanner">Biometric Scanners</SelectItem>
              </Select>
            </div>

            <div>
              <label className="font-medium mb-1 block">Binary Storage URL</label>
              <Input
                value={otaBinaryUrl}
                onChange={(e) => setOtaBinaryUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="font-medium mb-1 block">SHA-256 Checksum</label>
              <Input
                value={otaSha256}
                onChange={(e) => setOtaSha256(e.target.value)}
                className="font-mono text-[11px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowOtaDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleOtaSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Deploying..." : "Launch Canary Rollout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
