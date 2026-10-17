'use client';

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { PermissionGate } from '@/components/ui/permission-gate';
import { cn } from '@/lib/utils';
import type {
  VisionAlertEvent,
  VisionCameraEvent,
  VisionConnectionStatus,
  VisionDetectionClass,
} from '@/lib/operations/vision/streaming/vision-stream-types';
import {
  AlertTriangle,
  Camera as CameraIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crosshair,
  Download,
  LayoutGrid,
  Maximize2,
  Minimize2,
  RotateCcw,
  ShieldAlert,
  VideoOff,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

type GridMode = '4' | '9' | '1';

export type CctvCameraInput = Partial<VisionCameraEvent> & { cameraId: string };
export type CctvAlertInput = Partial<VisionAlertEvent>;

interface AmbientBox {
  detectionClass: VisionDetectionClass;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
  trackId: string;
  fromAlert: boolean;
}

interface PtzState {
  pan: number;
  tilt: number;
  zoom: number;
}

const HOME_PTZ: PtzState = { pan: 0, tilt: 0, zoom: 1 };

const DETECTION_STYLES: Record<
  VisionDetectionClass,
  { label: string; border: string; text: string; pulse: boolean }
> = {
  person: { label: 'PERSON', border: 'border-emerald-400', text: 'text-emerald-300', pulse: false },
  vehicle: { label: 'VEHICLE', border: 'border-sky-400', text: 'text-sky-300', pulse: false },
  unauthorized_intrusion: {
    label: 'INTRUSION',
    border: 'border-amber-400',
    text: 'text-amber-300',
    pulse: false,
  },
  weapon_detected: { label: 'WEAPON', border: 'border-rose-500', text: 'text-rose-300', pulse: true },
};

const SMPTE_BARS =
  'linear-gradient(90deg,#c0c0c0 0 14.28%,#c0c000 14.28% 28.57%,#00c0c0 28.57% 42.85%,#00c000 42.85% 57.14%,#c000c0 57.14% 71.42%,#c00000 71.42% 85.71%,#0000c0 85.71% 100%)';

function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

function clamp01(v: number): number {
  return Math.min(0.98, Math.max(0.01, v));
}

function jitter(seed: string, tick: number, salt: number): number {
  const s = `${seed}:${salt}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (Math.sin(((h >>> 0) % 1000) * 0.017 + tick * 0.35 + salt * 1.7) + 1) / 2;
}

function ambientDetections(cameraId: string, zoneType: string, tick: number): AmbientBox[] {
  const count = zoneType === 'common_area' ? 3 : zoneType === 'entrance' ? 2 : zoneType === 'parking' ? 2 : 1;
  const boxes: AmbientBox[] = [];
  for (let i = 0; i < count; i++) {
    const isVehicle = zoneType === 'parking' && i === 0;
    const w = isVehicle ? 0.28 : 0.12;
    const h = isVehicle ? 0.18 : 0.32;
    boxes.push({
      detectionClass: isVehicle ? 'vehicle' : 'person',
      confidence: 0.62 + jitter(cameraId, tick, i * 3 + 2) * 0.36,
      x: clamp01(0.04 + jitter(cameraId, tick, i * 3) * (0.9 - w)),
      y: clamp01(0.12 + jitter(cameraId, tick, i * 3 + 1) * 0.5),
      w,
      h,
      trackId: `trk_${cameraId}_${i}`,
      fromAlert: false,
    });
  }
  return boxes;
}

function alertBoxes(alerts: CctvAlertInput[], cameraId: string): AmbientBox[] {
  const boxes: AmbientBox[] = [];
  for (const a of alerts) {
    if (a.cameraId !== cameraId || !Array.isArray(a.boundingBoxes)) continue;
    for (const b of a.boundingBoxes) {
      if (!b || typeof b.x !== 'number') continue;
      boxes.push({
        detectionClass: b.detectionClass ?? 'person',
        confidence: typeof b.confidence === 'number' ? b.confidence : 0.5,
        x: clamp01(b.x),
        y: clamp01(b.y),
        w: b.w,
        h: b.h,
        trackId: b.trackId || `alt_${a.alertId}`,
        fromAlert: true,
      });
    }
  }
  return boxes;
}

function activeAlertsForCamera(alerts: CctvAlertInput[], cameraId: string): CctvAlertInput[] {
  return alerts.filter((a) => a.cameraId === cameraId && (a.status === undefined || a.status === 'active'));
}

function formatConfidence(c: number): string {
  return `${(c * 100).toFixed(1)}%`;
}

function bitrateMbps(resolution: string | undefined, fps: number | undefined, cameraId: string, nowSec: number): string {
  const base = resolution === '4K' ? 8.2 : 4.2;
  const factor = (fps ?? 30) / 30;
  const jitterVal = (hash01(cameraId) + (nowSec % 5) / 10) * 0.4;
  return (base * factor + jitterVal).toFixed(1);
}

function effectiveFps(fps: number | undefined, tick: number): number {
  const base = fps ?? 30;
  return Math.max(0, base + (tick % 3) - 1);
}

function connectionBadge(status: VisionConnectionStatus | undefined): { variant: 'success' | 'info' | 'warning' | 'secondary'; label: string } {
  switch (status) {
    case 'connected':
      return { variant: 'success', label: 'LIVE STREAM' };
    case 'mock':
      return { variant: 'info', label: 'SIM FEED' };
    case 'reconnecting':
      return { variant: 'warning', label: 'RECONNECTING' };
    case 'offline':
      return { variant: 'secondary', label: 'OFFLINE' };
    default:
      return { variant: 'secondary', label: 'CONNECTING' };
  }
}

interface DetectionLayerProps {
  boxes: AmbientBox[];
}

const DetectionLayer = memo(function DetectionLayer({ boxes }: DetectionLayerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {boxes.map((b) => {
        const style = DETECTION_STYLES[b.detectionClass] ?? DETECTION_STYLES.person;
        return (
          <div
            key={b.trackId}
            className={cn(
              'absolute border-2 transition-all duration-700 ease-linear',
              style.border,
              style.pulse && 'animate-pulse'
            )}
            style={{
              left: `${b.x * 100}%`,
              top: `${b.y * 100}%`,
              width: `${b.w * 100}%`,
              height: `${b.h * 100}%`,
            }}
          >
            <span
              className={cn(
                'absolute -top-[18px] left-0 rounded-sm bg-black/80 px-1 font-mono text-[9px] leading-[16px] tracking-wide',
                style.text
              )}
            >
              {style.label} {formatConfidence(b.confidence)}
            </span>
          </div>
        );
      })}
    </div>
  );
});

interface CameraFeedProps {
  camera: CctvCameraInput;
  boxes: AmbientBox[];
  clock: string;
  tick: number;
  nowSec: number;
  ptz: PtzState;
  focusMode?: boolean;
}

const CameraFeed = memo(function CameraFeed({
  camera,
  boxes,
  clock,
  tick,
  nowSec,
  ptz,
  focusMode = false,
}: CameraFeedProps) {
  const status = camera.status ?? 'online';
  const offline = status === 'offline';
  const degraded = status === 'degraded';
  const resolution = camera.resolution ?? '1080p';
  const fps = offline ? 0 : effectiveFps(camera.fps, tick);
  const bitrate = offline ? '0.0' : bitrateMbps(resolution, camera.fps, camera.cameraId, nowSec);
  const reconnectIn = 10 - (nowSec % 11);
  const seedX = 12 + hash01(camera.cameraId + 'bx') * 55;
  const seedY = 20 + hash01(camera.cameraId + 'by') * 45;

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {offline ? (
        <div className="absolute inset-0 flex flex-col">
          <div className="flex-1" style={{ backgroundImage: SMPTE_BARS }} />
          <div className="flex h-[22%] items-center justify-center bg-[repeating-linear-gradient(0deg,#111_0_2px,#1a1a1a_2px_4px)]">
            <span className="font-mono text-[10px] tracking-widest text-slate-400">SIGNAL LOSS — SMPTE BARS</span>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60">
            <VideoOff className={cn('h-5 w-5 text-slate-300', 'animate-pulse')} />
            <span className="font-mono text-xs tracking-widest text-slate-200">RECONNECTING IN {reconnectIn}s</span>
          </div>
          <div className="absolute inset-0 animate-pulse bg-[repeating-linear-gradient(0deg,transparent_0_2px,rgba(255,255,255,0.04)_2px_3px)]" />
        </div>
      ) : (
        <div
          className="absolute inset-0 transition-transform duration-300 ease-out"
          style={{ transform: `scale(${ptz.zoom}) translate(${ptz.pan}%, ${ptz.tilt}%)` }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_10%,#1e293b_0%,#0f172a_55%,#020617_100%)]" />
          <div
            className="absolute h-24 w-24 rounded-full bg-sky-500/15 blur-2xl animate-pulse"
            style={{ left: `${seedX}%`, top: `${seedY}%`, animationDelay: `${hash01(camera.cameraId) * 2}s` }}
          />
          <div
            className="absolute h-16 w-16 rounded-full bg-emerald-500/10 blur-2xl animate-pulse"
            style={{ left: `${(seedX + 37) % 80}%`, top: `${(seedY + 23) % 70}%`, animationDelay: '0.8s' }}
          />
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0_3px,rgba(0,0,0,0.18)_3px_4px)]" />
          <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.75)]" />
          <DetectionLayer boxes={boxes} />
        </div>
      )}

      {degraded && !offline && (
        <div className="absolute inset-0 animate-pulse bg-[repeating-linear-gradient(0deg,transparent_0_1px,rgba(255,255,255,0.06)_1px_2px)]" />
      )}

      <div className="absolute left-2 top-2 flex items-center gap-1.5">
        {offline ? (
          <Badge variant="destructive" className="py-0 font-mono">NO SIGNAL</Badge>
        ) : (
          <Badge variant={degraded ? 'warning' : 'success'} className="py-0 font-mono">
            {degraded ? 'DEGRADED' : 'LIVE'}
          </Badge>
        )}
        {camera.recordingActive !== false && !offline && (
          <span className="flex items-center gap-1 rounded-sm bg-black/70 px-1.5 py-0.5 font-mono text-[9px] text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" /> REC
          </span>
        )}
      </div>

      <div className="absolute right-2 top-2 flex items-center gap-1.5 font-mono text-[9px]">
        <span className="rounded-sm bg-black/70 px-1.5 py-0.5 text-slate-200">{resolution}</span>
        <span className="rounded-sm bg-black/70 px-1.5 py-0.5 text-slate-200">{fps} FPS</span>
        <span className="hidden sm:inline rounded-sm bg-black/70 px-1.5 py-0.5 text-slate-300">{bitrate} Mbps</span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-4">
        <div className="min-w-0">
          <div className="truncate font-mono text-[10px] text-emerald-300">{camera.cameraId}</div>
          <div className={cn('truncate text-[11px] font-medium', focusMode ? 'text-white' : 'text-slate-100')}>
            {camera.name || camera.cameraId}
          </div>
        </div>
        <span className="ml-2 shrink-0 font-mono text-[9px] text-slate-300">{clock}</span>
      </div>
    </div>
  );
});

interface PtZPadProps {
  value: PtzState;
  onChange: (next: PtzState) => void;
}

function PtZPad({ value, onChange }: PtZPadProps) {
  const step = 4;
  const clampPan = (v: number) => Math.min(24, Math.max(-24, v));
  const clampTilt = (v: number) => Math.min(24, Math.max(-24, v));
  const clampZoom = (v: number) => Math.min(3, Math.max(1, v));

  const padBtn =
    'flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 disabled:opacity-40';

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1 w-fit">
        <span />
        <button type="button" aria-label="Tilt up" className={padBtn} onClick={() => onChange({ ...value, tilt: clampTilt(value.tilt - step) })}>
          <ChevronUp className="h-4 w-4" />
        </button>
        <span />
        <button type="button" aria-label="Pan left" className={padBtn} onClick={() => onChange({ ...value, pan: clampPan(value.pan - step) })}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" aria-label="PTZ home" className={padBtn} onClick={() => onChange({ ...HOME_PTZ })}>
          <Crosshair className="h-3.5 w-3.5" />
        </button>
        <button type="button" aria-label="Pan right" className={padBtn} onClick={() => onChange({ ...value, pan: clampPan(value.pan + step) })}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <span />
        <button type="button" aria-label="Tilt down" className={padBtn} onClick={() => onChange({ ...value, tilt: clampTilt(value.tilt + step) })}>
          <ChevronDown className="h-4 w-4" />
        </button>
        <span />
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Zoom out"
          className={padBtn}
          disabled={value.zoom <= 1}
          onClick={() => onChange({ ...value, zoom: clampZoom(Number((value.zoom - 0.25).toFixed(2))) })}
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="w-14 text-center font-mono text-[10px] text-slate-400">x{value.zoom.toFixed(2)}</span>
        <button
          type="button"
          aria-label="Zoom in"
          className={padBtn}
          disabled={value.zoom >= 3}
          onClick={() => onChange({ ...value, zoom: clampZoom(Number((value.zoom + 0.25).toFixed(2))) })}
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <Button variant="secondary" size="sm" className="ml-auto h-8" onClick={() => onChange({ ...HOME_PTZ })}>
          <RotateCcw className="mr-1 h-3 w-3" /> Home
        </Button>
      </div>
    </div>
  );
}

interface CctvMatrixCardProps {
  cameras: CctvCameraInput[];
  alerts?: CctvAlertInput[];
  connectionStatus?: VisionConnectionStatus;
  audioMuted?: boolean;
  onToggleAudioMute?: () => void;
  onTriggerZoneLockdown?: (camera: CctvCameraInput) => Promise<void>;
  className?: string;
}

export function CctvMatrixCard({
  cameras,
  alerts = [],
  connectionStatus,
  audioMuted = true,
  onToggleAudioMute,
  onTriggerZoneLockdown,
  className,
}: CctvMatrixCardProps) {
  const [gridMode, setGridMode] = useState<GridMode>('4');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [clock, setClock] = useState({ now: 0, ts: '--:--:--' });
  const [ptzMap, setPtzMap] = useState<Record<string, PtzState>>({});
  const [lockdownBusy, setLockdownBusy] = useState(false);
  const [lockdownError, setLockdownError] = useState<string | null>(null);
  const [lockdownDone, setLockdownDone] = useState(false);

  useEffect(() => {
    const update = () => {
      const t = Date.now();
      setClock({ now: t, ts: new Date(t).toISOString().slice(11, 19) });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 700);
    return () => clearInterval(id);
  }, []);

  const orderedCameras = useMemo(() => {
    if (!selectedId) return cameras;
    const sel = cameras.find((c) => c.cameraId === selectedId);
    if (!sel) return cameras;
    return [sel, ...cameras.filter((c) => c.cameraId !== selectedId)];
  }, [cameras, selectedId]);

  const visibleCameras = useMemo(() => {
    if (gridMode === '1') {
      const sel = orderedCameras.find((c) => c.cameraId === selectedId) ?? orderedCameras[0];
      return sel ? [sel] : [];
    }
    return orderedCameras.slice(0, gridMode === '4' ? 4 : 9);
  }, [orderedCameras, selectedId, gridMode]);

  const detectionsByCamera = useMemo(() => {
    const map = new Map<string, AmbientBox[]>();
    for (const cam of visibleCameras) {
      const ambient = ambientDetections(cam.cameraId, cam.zoneType ?? '', tick);
      const fromAlerts = alertBoxes(alerts, cam.cameraId);
      map.set(cam.cameraId, [...fromAlerts, ...ambient]);
    }
    return map;
  }, [visibleCameras, alerts, tick]);

  const selectedCamera = visibleCameras[0] ?? null;
  const nowSec = Math.floor(clock.now / 1000);
  const badge = connectionBadge(connectionStatus);

  const getPtz = useCallback(
    (cameraId: string): PtzState => ptzMap[cameraId] ?? HOME_PTZ,
    [ptzMap]
  );

  const setPtz = useCallback((cameraId: string, next: PtzState) => {
    setPtzMap((prev) => ({ ...prev, [cameraId]: next }));
  }, []);

  const focusCamera = useCallback((cameraId: string) => {
    setSelectedId(cameraId);
    setGridMode('1');
    setLockdownError(null);
    setLockdownDone(false);
  }, []);

  const exitFocus = useCallback(() => {
    setGridMode('4');
    setLockdownError(null);
    setLockdownDone(false);
  }, []);

  const captureSnapshot = useCallback(
    (camera: CctvCameraInput, boxes: AmbientBox[]) => {
      if (typeof document === 'undefined') return;
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, 640, 360);
      ctx.strokeStyle = 'rgba(148,163,184,0.25)';
      for (let gx = 0; gx <= 640; gx += 64) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, 360);
        ctx.stroke();
      }
      for (let gy = 0; gy <= 360; gy += 36) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(640, gy);
        ctx.stroke();
      }
      for (const b of boxes) {
        const color =
          b.detectionClass === 'weapon_detected'
            ? '#f43f5e'
            : b.detectionClass === 'unauthorized_intrusion'
              ? '#fbbf24'
              : b.detectionClass === 'vehicle'
                ? '#38bdf8'
                : '#34d399';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x * 640, b.y * 360, b.w * 640, b.h * 360);
        ctx.fillStyle = color;
        ctx.font = '10px monospace';
        ctx.fillText(
          `${DETECTION_STYLES[b.detectionClass]?.label ?? 'OBJ'} ${formatConfidence(b.confidence)}`,
          b.x * 640,
          Math.max(10, b.y * 360 - 4)
        );
      }
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 330, 640, 30);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px monospace';
      ctx.fillText(`${camera.cameraId} — ${camera.name || 'SNAPSHOT'} — ${clock.ts}Z`, 8, 349);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${camera.cameraId}_snapshot_${clock.ts.replace(/:/g, '')}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    },
    [clock.ts]
  );

  const handleZoneLockdown = useCallback(async () => {
    if (!selectedCamera || !onTriggerZoneLockdown) return;
    setLockdownBusy(true);
    setLockdownError(null);
    setLockdownDone(false);
    try {
      await onTriggerZoneLockdown(selectedCamera);
      setLockdownDone(true);
    } catch (err) {
      setLockdownError(err instanceof Error ? err.message : 'Failed to trigger zone lockdown.');
    } finally {
      setLockdownBusy(false);
    }
  }, [selectedCamera, onTriggerZoneLockdown]);

  const gridCols = gridMode === '9' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2';

  const modeBtn = (mode: GridMode, label: string, Icon: React.ComponentType<{ className?: string }>) => (
    <Button
      key={mode}
      variant={gridMode === mode ? 'default' : 'secondary'}
      size="sm"
      onClick={() => {
        setGridMode(mode);
        setLockdownError(null);
        setLockdownDone(false);
      }}
      aria-pressed={gridMode === mode}
    >
      <Icon className="mr-1 h-3.5 w-3.5" />
      {label}
    </Button>
  );

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LayoutGrid className="h-4 w-4 text-emerald-600" />
            Live CCTV Matrix — Edge AI Overlay Grid
          </CardTitle>
          <p className="text-xs text-slate-500">
            {cameras.filter((c) => (c.status ?? 'online') !== 'offline').length}/{cameras.length} feeds online · YOLOv11x + DeepSORT tracking
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={badge.variant} className="font-mono">{badge.label}</Badge>
          {onToggleAudioMute && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onToggleAudioMute}
              aria-label={audioMuted ? 'Unmute alert chimes' : 'Mute alert chimes'}
            >
              {audioMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </Button>
          )}
          {modeBtn('4', '4-Up', LayoutGrid)}
          {modeBtn('9', '9-Up', Maximize2)}
          {modeBtn('1', 'Focus', Minimize2)}
        </div>
      </CardHeader>
      <CardContent>
        {visibleCameras.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 text-slate-500">
            <VideoOff className="h-6 w-6" />
            <p className="text-sm">No camera feeds available</p>
          </div>
        ) : gridMode === '1' && selectedCamera ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-800">
              <CameraFeed
                camera={selectedCamera}
                boxes={detectionsByCamera.get(selectedCamera.cameraId) ?? []}
                clock={clock.ts}
                tick={tick}
                nowSec={nowSec}
                ptz={getPtz(selectedCamera.cameraId)}
                focusMode
              />
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">Inspection</span>
                  <Button variant="secondary" size="sm" onClick={exitFocus}>
                    <Minimize2 className="mr-1 h-3 w-3" /> Back to grid
                  </Button>
                </div>
                <dl className="space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between"><dt>Camera</dt><dd className="font-mono">{selectedCamera.cameraId}</dd></div>
                  <div className="flex justify-between"><dt>Zone</dt><dd>{selectedCamera.zoneType || '—'}</dd></div>
                  <div className="flex justify-between">
                    <dt>Status</dt>
                    <dd>
                      <Badge variant={(selectedCamera.status ?? 'online') === 'online' ? 'success' : (selectedCamera.status === 'degraded' ? 'warning' : 'destructive')} className="py-0">
                        {(selectedCamera.status ?? 'online').toUpperCase()}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex justify-between"><dt>Stream</dt><dd>{selectedCamera.resolution ?? '1080p'} @ {effectiveFps(selectedCamera.fps, tick)} FPS</dd></div>
                </dl>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">Active Detections</span>
                  <Badge variant="info" className="py-0 font-mono">
                    {(detectionsByCamera.get(selectedCamera.cameraId) ?? []).length}
                  </Badge>
                </div>
                <ul className="max-h-32 space-y-1 overflow-y-auto">
                  {(detectionsByCamera.get(selectedCamera.cameraId) ?? []).map((b) => {
                    const style = DETECTION_STYLES[b.detectionClass] ?? DETECTION_STYLES.person;
                    return (
                      <li key={b.trackId} className="flex items-center justify-between text-xs">
                        <span className={cn('font-mono', style.text)}>
                          {style.label}
                          {b.fromAlert && <span className="ml-1 text-amber-500">ALERT</span>}
                        </span>
                        <span className="font-mono text-slate-500">{formatConfidence(b.confidence)} · {b.trackId}</span>
                      </li>
                    );
                  })}
                  {(detectionsByCamera.get(selectedCamera.cameraId) ?? []).length === 0 && (
                    <li className="text-xs text-slate-400">No active detections</li>
                  )}
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <span className="mb-2 block text-sm font-semibold">Virtual PTZ</span>
                <PtZPad value={getPtz(selectedCamera.cameraId)} onChange={(next) => setPtz(selectedCamera.cameraId, next)} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => captureSnapshot(selectedCamera, detectionsByCamera.get(selectedCamera.cameraId) ?? [])}
                >
                  <Download className="mr-1 h-3.5 w-3.5" /> Snapshot
                </Button>
                <PermissionGate permission="vision:lockdown:execute" fallback={null}>
                  <Button variant="destructive" size="sm" disabled={lockdownBusy} onClick={handleZoneLockdown}>
                    <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                    {lockdownBusy ? 'Securing Zone…' : 'Zone Lockdown'}
                  </Button>
                </PermissionGate>
              </div>
              {lockdownError && (
                <Alert variant="error">
                  <AlertTriangle className="h-4 w-4" /> {lockdownError}
                </Alert>
              )}
              {lockdownDone && (
                <Alert variant="success">
                  <ShieldAlert className="h-4 w-4" /> Zone lockdown command accepted for {selectedCamera.zoneType || selectedCamera.cameraId}.
                </Alert>
              )}
            </div>
          </div>
        ) : (
          <div className={cn('grid gap-3', gridCols)}>
            {visibleCameras.map((camera) => {
              const cams = activeAlertsForCamera(alerts, camera.cameraId);
              const critical = cams.some((a) => a.severity === 'critical' || a.severity === 'high');
              return (
                <button
                  key={camera.cameraId}
                  type="button"
                  onClick={() => focusCamera(camera.cameraId)}
                  className={cn(
                    'group relative aspect-video overflow-hidden rounded-lg border text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                    critical ? 'border-rose-500 ring-1 ring-rose-500/60 animate-pulse' : 'border-slate-800 hover:shadow-lg hover:shadow-emerald-500/10'
                  )}
                  aria-label={`Focus camera ${camera.name || camera.cameraId}`}
                >
                  <CameraFeed
                    camera={camera}
                    boxes={detectionsByCamera.get(camera.cameraId) ?? []}
                    clock={clock.ts}
                    tick={tick}
                    nowSec={nowSec}
                    ptz={getPtz(camera.cameraId)}
                  />
                  {cams.length > 0 && (
                    <span className="absolute bottom-10 right-2 flex items-center gap-1 rounded-sm bg-rose-600/90 px-1.5 py-0.5 font-mono text-[9px] text-white">
                      <AlertTriangle className="h-3 w-3" />
                      {cams.length} ALERT{cams.length > 1 ? 'S' : ''}
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <span className="flex items-center gap-1 rounded-md bg-slate-900/90 px-2.5 py-1 text-xs font-medium text-white">
                      <CameraIcon className="h-3.5 w-3.5" /> Inspect
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
