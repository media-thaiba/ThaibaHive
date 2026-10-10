"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ensureArray } from "@/lib/utils";
import {
  Radio,
  Users,
  ShieldAlert,
  Layers,
  RefreshCw,
  Maximize2,
  Navigation,
} from "lucide-react";

export interface RadarZone {
  id: string;
  name: string;
  type: string;
  floorNumber: number;
  coordinatesX?: number | null;
  coordinatesY?: number | null;
  width?: number | null;
  height?: number | null;
  boundaryCoordinates?: Array<[number, number]>;
  isMusterPoint?: boolean;
}

export interface RadarBlip {
  id: string;
  label: string;
  type: "staff" | "student" | "visitor" | "security" | "asset";
  coordinates: { x: number; y: number };
  zoneName?: string;
  rssi?: number;
  lastSeen: string;
}

export interface AnchorNode {
  id: string;
  name: string;
  coordinates: { x: number; y: number };
  status: "online" | "offline";
  rssiScanCount?: number;
}

interface CampusRadarMapProps {
  zones?: RadarZone[];
  blips?: RadarBlip[];
  anchors?: AnchorNode[];
  selectedFloor?: number;
  onFloorChange?: (floor: number) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function CampusRadarMap({
  zones = [],
  blips = [],
  anchors = [],
  selectedFloor = 0,
  onFloorChange,
  isLoading = false,
  onRefresh,
}: CampusRadarMapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  const safeZones: RadarZone[] = ensureArray(zones);
  const safeBlips: RadarBlip[] = ensureArray(blips);
  const safeAnchors: AnchorNode[] = ensureArray(anchors);

  // 60 FPS Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let pulseAngle = 0;

    const render = () => {
      pulseAngle += 0.04;
      const width = canvas.width;
      const height = canvas.height;

      // Clear Canvas & draw dark tactical grid
      ctx.fillStyle = "#0B0F17";
      ctx.fillRect(0, 0, width, height);

      // Draw Grid Lines (10m x 10m grid)
      ctx.strokeStyle = "rgba(30, 41, 59, 0.6)";
      ctx.lineWidth = 1;
      const gridSize = 40 * zoomLevel;

      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Zone Polygons
      for (const zone of safeZones) {
        if (zone.floorNumber !== selectedFloor) continue;

        if (zone.boundaryCoordinates && zone.boundaryCoordinates.length >= 3) {
          ctx.beginPath();
          const [startPoint, ...restPoints] = zone.boundaryCoordinates;
          ctx.moveTo(startPoint[0] * zoomLevel + 50, startPoint[1] * zoomLevel + 50);

          for (const pt of restPoints) {
            ctx.lineTo(pt[0] * zoomLevel + 50, pt[1] * zoomLevel + 50);
          }
          ctx.closePath();

          ctx.fillStyle = zone.isMusterPoint
            ? "rgba(16, 185, 129, 0.15)"
            : "rgba(59, 130, 246, 0.10)";
          ctx.fill();

          ctx.strokeStyle = zone.isMusterPoint
            ? "rgba(16, 185, 129, 0.6)"
            : "rgba(59, 130, 246, 0.4)";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Zone Label
          ctx.fillStyle = zone.isMusterPoint ? "#10B981" : "#94A3B8";
          ctx.font = "11px Inter, sans-serif";
          ctx.fillText(
            zone.name,
            startPoint[0] * zoomLevel + 60,
            startPoint[1] * zoomLevel + 70
          );
        } else if (
          zone.coordinatesX !== null &&
          zone.coordinatesY !== null &&
          zone.width &&
          zone.height
        ) {
          const zx = (zone.coordinatesX || 0) * zoomLevel + 50;
          const zy = (zone.coordinatesY || 0) * zoomLevel + 50;
          const zw = zone.width * zoomLevel;
          const zh = zone.height * zoomLevel;

          ctx.fillStyle = zone.isMusterPoint
            ? "rgba(16, 185, 129, 0.15)"
            : "rgba(59, 130, 246, 0.10)";
          ctx.fillRect(zx, zy, zw, zh);

          ctx.strokeStyle = zone.isMusterPoint
            ? "rgba(16, 185, 129, 0.6)"
            : "rgba(59, 130, 246, 0.4)";
          ctx.strokeRect(zx, zy, zw, zh);

          ctx.fillStyle = zone.isMusterPoint ? "#10B981" : "#94A3B8";
          ctx.font = "11px Inter, sans-serif";
          ctx.fillText(zone.name, zx + 8, zy + 18);
        }
      }

      // Draw Anchor BLE Scanners
      for (const anchor of safeAnchors) {
        const ax = anchor.coordinates.x * zoomLevel + 50;
        const ay = anchor.coordinates.y * zoomLevel + 50;

        // Radiating pulse ring
        const pulseRadius = (15 + (Math.sin(pulseAngle) + 1) * 8) * zoomLevel;
        ctx.beginPath();
        ctx.arc(ax, ay, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle =
          anchor.status === "online"
            ? "rgba(99, 102, 241, 0.3)"
            : "rgba(239, 68, 68, 0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Anchor Node Icon Dot
        ctx.beginPath();
        ctx.arc(ax, ay, 5, 0, Math.PI * 2);
        ctx.fillStyle = anchor.status === "online" ? "#6366F1" : "#EF4444";
        ctx.fill();

        ctx.fillStyle = "#CBD5E1";
        ctx.font = "10px Inter, sans-serif";
        ctx.fillText(anchor.name, ax + 8, ay + 4);
      }

      // Draw Badge Blips
      for (const blip of safeBlips) {
        const bx = blip.coordinates.x * zoomLevel + 50;
        const by = blip.coordinates.y * zoomLevel + 50;

        // Color by entity type
        let color = "#3B82F6"; // Student/Default
        if (blip.type === "staff") color = "#10B981"; // Staff Green
        if (blip.type === "security") color = "#F59E0B"; // Security Yellow
        if (blip.type === "visitor") color = "#EC4899"; // Visitor Pink

        // Glowing outer pulse
        ctx.beginPath();
        ctx.arc(bx, by, 6 + Math.sin(pulseAngle * 2) * 2, 0, Math.PI * 2);
        ctx.fillStyle = `${color}44`;
        ctx.fill();

        // Solid Center Core
        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Blip Label
        ctx.fillStyle = "#F8FAFC";
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.fillText(blip.label, bx + 8, by - 4);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [safeZones, safeBlips, safeAnchors, selectedFloor, zoomLevel]);

  return (
    <div className="flex flex-col bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Campus Spatial Radar</h3>
            <p className="text-xs text-muted-foreground">
              Real-Time BLE Beacon & Anchor Triangulation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Floor Selector */}
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <Select
              value={selectedFloor.toString()}
              onChange={(e) => onFloorChange?.(parseInt(e.target.value, 10))}
              className="w-44 text-xs"
            >
              <SelectItem value="0">Ground Floor (L0)</SelectItem>
              <SelectItem value="1">1st Floor (L1)</SelectItem>
              <SelectItem value="2">2nd Floor (L2)</SelectItem>
              <SelectItem value="3">3rd Floor (L3)</SelectItem>
            </Select>
          </div>

          {/* Zoom Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
          >
            -
          </Button>
          <span className="text-xs font-mono px-1">
            {Math.round(zoomLevel * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.2))}
          >
            +
          </Button>

          {/* Refresh Button */}
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
        </div>
      </div>

      {/* Radar Map Canvas Viewport */}
      <div className="relative w-full h-[520px] bg-[#0B0F17] flex items-center justify-center overflow-hidden">
        {isLoading ? (
          <div className="space-y-4 w-full px-12">
            <Skeleton className="h-8 w-1/3 mx-auto" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={900}
            height={520}
            className="w-full h-full cursor-crosshair"
          />
        )}

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md rounded-lg p-2.5 border border-white/10 flex items-center gap-4 text-xs text-white">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Staff</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Student</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
            <span>Visitor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>BLE Anchor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm border border-emerald-500 bg-emerald-500/20" />
            <span>Muster Zone</span>
          </div>
        </div>

        {/* Active Trackers Counter Pill */}
        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10 flex items-center gap-2 text-xs text-white">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{safeBlips.length} Tracked Blips Live</span>
        </div>
      </div>
    </div>
  );
}
