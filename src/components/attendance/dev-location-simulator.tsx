"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPinIcon, WifiIcon } from "lucide-react";

type DevLocationSimulatorProps = {
  latitude: number | undefined;
  longitude: number | undefined;
  wifiSsid: string | undefined;
  onLatitudeChange: (v: number | undefined) => void;
  onLongitudeChange: (v: number | undefined) => void;
  onWifiSsidChange: (v: string | undefined) => void;
};

export function DevLocationSimulator({
  latitude,
  longitude,
  wifiSsid,
  onLatitudeChange,
  onLongitudeChange,
  onWifiSsidChange,
}: DevLocationSimulatorProps) {
  const [expanded, setExpanded] = useState(false);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="rounded-xl border border-dashed border-warning/40 bg-warning/5 p-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-left"
      >
        <MapPinIcon className="h-3.5 w-3.5 text-warning" />
        <span className="text-xs font-medium text-warning">
          Dev Location Simulator
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {expanded ? "▲" : "▼"}
        </span>
      </button>
      {expanded && (
        <div className="mt-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Latitude
              </Label>
              <Input
                type="number"
                step="any"
                value={latitude ?? ""}
                onChange={(e) =>
                  onLatitudeChange(
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                placeholder="e.g. 13.7563"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Longitude
              </Label>
              <Input
                type="number"
                step="any"
                value={longitude ?? ""}
                onChange={(e) =>
                  onLongitudeChange(
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                placeholder="e.g. 100.5018"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">
              WiFi SSID
            </Label>
            <div className="relative">
              <WifiIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                value={wifiSsid ?? ""}
                onChange={(e) =>
                  onWifiSsidChange(e.target.value || undefined)
                }
                placeholder="e.g. Office-WiFi"
                className="h-8 text-xs font-mono pl-8"
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            These values override browser geolocation when submitting check-in
            requests. Only visible in development.
          </p>
        </div>
      )}
    </div>
  );
}
