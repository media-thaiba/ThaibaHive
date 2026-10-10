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
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Lock,
  Unlock,
  AlertTriangle,
  Fingerprint,
  Search,
  RefreshCw,
} from "lucide-react";

export interface GateAccessEvent {
  id: string;
  eventType: string;
  badgeId?: string | null;
  staffId?: string | null;
  studentId?: string | null;
  deviceId: string;
  zoneId?: string | null;
  authenticationMethod: string;
  verificationResult: string;
  antiPassbackViolation: boolean;
  emergencyOverride: boolean;
  timestamp: string;
}

interface GateMonitoringConsoleProps {
  events?: GateAccessEvent[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onLockdownToggle?: (isLocked: boolean, reason?: string) => Promise<void>;
  isLockedDown?: boolean;
}

export function GateMonitoringConsole({
  events = [],
  isLoading = false,
  onRefresh,
  onLockdownToggle,
  isLockedDown = false,
}: GateMonitoringConsoleProps) {
  const [showLockdownDialog, setShowLockdownDialog] = useState(false);
  const [lockdownReason, setLockdownReason] = useState("");
  const [isTogglingLockdown, setIsTogglingLockdown] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [resultFilter, setResultFilter] = useState("all");

  const safeEvents: GateAccessEvent[] = ensureArray(events);

  const filteredEvents = safeEvents.filter((ev) => {
    if (resultFilter === "granted" && ev.verificationResult !== "success") return false;
    if (resultFilter === "denied" && ev.verificationResult === "success") return false;
    if (resultFilter === "apb" && !ev.antiPassbackViolation) return false;

    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const badgeMatch = ev.badgeId?.toLowerCase().includes(q);
      const devMatch = ev.deviceId.toLowerCase().includes(q);
      const resMatch = ev.verificationResult.toLowerCase().includes(q);
      if (!badgeMatch && !devMatch && !resMatch) return false;
    }

    return true;
  });

  const handleConfirmLockdown = async () => {
    if (!onLockdownToggle) return;
    setIsTogglingLockdown(true);
    try {
      await onLockdownToggle(!isLockedDown, lockdownReason);
      setShowLockdownDialog(false);
      setLockdownReason("");
      toast.success(
        !isLockedDown
          ? "Facility Emergency Lockdown Activated"
          : "Emergency Lockdown Released"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update lockdown status");
    } finally {
      setIsTogglingLockdown(false);
    }
  };

  return (
    <div className="flex flex-col bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* Console Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Smart Gate & Anti-Passback Feed</h3>
            <p className="text-xs text-muted-foreground">
              Sub-50ms cryptographic transit telemetry & real-time enforcement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

          {/* Emergency Lockdown Button */}
          <Button
            variant={isLockedDown ? "outline" : "destructive"}
            size="sm"
            onClick={() => setShowLockdownDialog(true)}
            className="font-semibold"
          >
            {isLockedDown ? (
              <>
                <Unlock className="w-4 h-4 mr-1.5 text-emerald-500" />
                Release Lockdown
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-1.5 animate-pulse" />
                Emergency Lockdown
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b gap-4 bg-muted/10">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search badge UID, turnstile device, or status..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="w-48 text-xs"
          >
            <SelectItem value="all">All Transits</SelectItem>
            <SelectItem value="granted">Granted Only</SelectItem>
            <SelectItem value="denied">Denied / Violations</SelectItem>
            <SelectItem value="apb">Anti-Passback Violations</SelectItem>
          </Select>
        </div>
      </div>

      {/* Events Table List */}
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No gate access events recorded matching filter.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0 border-b">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Decision</th>
                <th className="py-2.5 px-4 font-semibold">Credential / Badge</th>
                <th className="py-2.5 px-4 font-semibold">Turnstile Device</th>
                <th className="py-2.5 px-4 font-semibold">Auth Method</th>
                <th className="py-2.5 px-4 font-semibold">APB Flags</th>
                <th className="py-2.5 px-4 font-semibold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredEvents.map((ev) => {
                const isGranted = ev.verificationResult === "success";
                const isApb = ev.antiPassbackViolation;

                return (
                  <tr key={ev.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      {isGranted ? (
                        <Badge variant="success" className="gap-1 font-medium">
                          <ShieldCheck className="w-3 h-3" />
                          Granted
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1 font-medium">
                          <ShieldX className="w-3 h-3" />
                          {ev.verificationResult}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {ev.badgeId || "Unknown Card"}
                    </td>
                    <td className="py-3 px-4 font-medium">{ev.deviceId}</td>
                    <td className="py-3 px-4">
                      <span className="uppercase text-[11px] px-2 py-0.5 rounded bg-muted">
                        {ev.authenticationMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {isApb && (
                        <Badge variant="warning" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Passback
                        </Badge>
                      )}
                      {ev.emergencyOverride && (
                        <Badge variant="info" className="gap-1 ml-1">
                          Override
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground font-mono">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Emergency Lockdown Confirmation Dialog */}
      <Dialog open={showLockdownDialog} onOpenChange={setShowLockdownDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              {isLockedDown ? "Release Facility Lockdown" : "Confirm Emergency Lockdown"}
            </DialogTitle>
            <DialogDescription>
              {!isLockedDown
                ? "Emergency lockdown will immediately lock all turnstiles, disable regular badge access, and only allow first responder credentials."
                : "Releasing lockdown will restore normal badge access control across all gates."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <label className="text-xs font-medium">Lockdown Reason / Incident Note</label>
            <Input
              placeholder="e.g. Active Security Drill or Incident in Sector 2"
              value={lockdownReason}
              onChange={(e) => setLockdownReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLockdownDialog(false)}
              disabled={isTogglingLockdown}
            >
              Cancel
            </Button>
            <Button
              variant={isLockedDown ? "default" : "destructive"}
              onClick={handleConfirmLockdown}
              disabled={isTogglingLockdown}
            >
              {isTogglingLockdown ? "Processing..." : isLockedDown ? "Confirm Release" : "Execute Lockdown"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
