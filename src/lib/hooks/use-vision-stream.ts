'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  VisionAlertEvent,
  VisionAlprEvent,
  VisionCameraEvent,
  VisionConnectionStatus,
  VisionGuardEvent,
  VisionIncidentEvent,
  VisionLockdownEvent,
  VisionStreamEventMap,
  VisionStreamTopic,
} from '@/lib/operations/vision/streaming/vision-stream-types';
import { VISION_STREAM_TOPICS } from '@/lib/operations/vision/streaming/vision-stream-types';

export type {
  VisionAlertEvent,
  VisionAlprEvent,
  VisionCameraEvent,
  VisionConnectionStatus,
  VisionGuardEvent,
  VisionIncidentEvent,
  VisionLockdownEvent,
  VisionStreamTopic,
} from '@/lib/operations/vision/streaming/vision-stream-types';

const BACKOFF_DELAYS_MS = [1000, 2000, 5000, 10000] as const;
const MAX_FLUSH_INTERVAL_MS = 1000 / 15; // 15fps state-flush ceiling
const HEARTBEAT_STALE_MS = 45_000;
const HEARTBEAT_WATCH_INTERVAL_MS = 10_000;
const MAX_ALERTS = 100;
const MAX_ALPR_EVENTS = 50;
const MAX_INCIDENTS = 50;
const AUDIO_MUTED_KEY = 'vision-audio-muted';
const AUDIO_VOLUME_KEY = 'vision-audio-volume';

const STREAM_PATH = '/api/vision/stream';

export interface UseVisionStreamOptions {
  /** Subset of topics to subscribe to; defaults to all Vision Stream topics. */
  topics?: VisionStreamTopic[];
  /**
   * `live` — always real SSE. `mock` — always local simulator.
   * `auto` (default) — real SSE, falling back to the mock simulator in
   * development only if the stream cannot be established.
   */
  streamMode?: 'live' | 'mock' | 'auto';
  /** Pause the connection entirely (e.g. tab hidden / feature gated). */
  enabled?: boolean;
}

interface PendingEvent {
  topic: VisionStreamTopic;
  data: unknown;
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Two-tone security chime via Web Audio API; no-ops when muted or unsupported. */
function playSecurityChime(muted: boolean, volume: number): void {
  if (muted || typeof window === 'undefined') return;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.value = Math.min(Math.max(volume, 0), 1);
    gain.connect(ctx.destination);
    const tone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(now + start);
      osc.stop(now + start + dur);
    };
    tone(880, 0, 0.12);
    tone(1174.66, 0.14, 0.18);
    window.setTimeout(() => ctx.close().catch(() => undefined), 600);
  } catch {
    // Audio must never break the stream pipeline.
  }
}

function readMutedPreference(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(AUDIO_MUTED_KEY) !== 'false';
  } catch {
    return true;
  }
}

function readVolumePreference(): number {
  if (typeof window === 'undefined') return 0.5;
  try {
    const raw = Number(window.localStorage.getItem(AUDIO_VOLUME_KEY));
    return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.5;
  } catch {
    return 0.5;
  }
}

/**
 * useVisionStream — resilient SSE subscription to `/api/vision/stream`.
 *
 * - Heartbeat watchdog: force-reconnects if the stream goes silent.
 * - Exponential backoff auto-reconnect (1s → 2s → 5s → 10s cap).
 * - requestAnimationFrame batching with a 15fps state-flush ceiling so
 *   high-volume CV inference surges cannot thrash React re-renders.
 * - Web Audio chimes for critical alerts / watchlist hits with operator
 *   mute + volume controls persisted to localStorage.
 * - Optional development mock simulator fallback (`streamMode: 'auto'`).
 */
export function useVisionStream(options: UseVisionStreamOptions = {}) {
  const { topics, streamMode = 'auto', enabled = true } = options;

  const topicKey = useMemo(
    () => (topics && topics.length > 0 ? [...topics].sort().join(',') : [...VISION_STREAM_TOPICS].join(',')),
    [topics]
  );

  const [connectionStatus, setConnectionStatus] = useState<VisionConnectionStatus>('connecting');
  const [liveAlerts, setLiveAlerts] = useState<VisionAlertEvent[]>([]);
  const [liveCameras, setLiveCameras] = useState<VisionCameraEvent[]>([]);
  const [liveGuards, setLiveGuards] = useState<VisionGuardEvent[]>([]);
  const [liveAlprEvents, setLiveAlprEvents] = useState<VisionAlprEvent[]>([]);
  const [liveIncidents, setLiveIncidents] = useState<VisionIncidentEvent[]>([]);
  const [activeLockdown, setActiveLockdown] = useState<VisionLockdownEvent | null>(null);
  const [audioMuted, setAudioMutedState] = useState(true);
  const [audioVolume, setAudioVolumeState] = useState(0.5);

  const pendingRef = useRef<PendingEvent[]>([]);
  const flushScheduledRef = useRef(false);
  const lastFlushAtRef = useRef(0);
  const lastEventAtRef = useRef(0);
  const attemptRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockRef = useRef<{ stop: () => void } | null>(null);
  const audioMutedRef = useRef(true);
  const audioVolumeRef = useRef(0.5);

  // ─── Event reduction (pure, applied on flush) ───
  const reduceIntoState = useCallback((events: PendingEvent[]) => {
    const alerts: VisionAlertEvent[] = [];
    const alpr: VisionAlprEvent[] = [];
    const incidents: VisionIncidentEvent[] = [];
    const cameras = new Map<string, VisionCameraEvent>();
    const guards = new Map<string, VisionGuardEvent>();
    let lockdown: { event: VisionLockdownEvent; clear: boolean } | null = null;

    for (const { topic, data } of events) {
      if (!isPlainObject(data)) continue;
      switch (topic) {
        case 'alerts':
          if (typeof data.alertId === 'string') alerts.push(data as unknown as VisionAlertEvent);
          break;
        case 'alpr':
          if (typeof data.logId === 'string') alpr.push(data as unknown as VisionAlprEvent);
          break;
        case 'incidents':
          if (typeof data.incidentId === 'string') incidents.push(data as unknown as VisionIncidentEvent);
          break;
        case 'cameras':
          if (typeof data.cameraId === 'string') cameras.set(data.cameraId, data as unknown as VisionCameraEvent);
          break;
        case 'guards':
          if (typeof data.guardId === 'string') guards.set(data.guardId, data as unknown as VisionGuardEvent);
          break;
        case 'lockdown':
          if (typeof data.lockdownId === 'string') {
            const evt = data as unknown as VisionLockdownEvent;
            lockdown = { event: evt, clear: evt.status === 'all_clear' || evt.status === 'cancelled' };
          }
          break;
        default:
          break;
      }
    }

    if (alerts.length > 0) {
      setLiveAlerts((prev) => {
        const seen = new Set(alerts.map((a) => a.alertId));
        return [...alerts.reverse(), ...prev.filter((a) => !seen.has(a.alertId))].slice(0, MAX_ALERTS);
      });
      if (alerts.some((a) => a.severity === 'critical' || a.severity === 'high')) {
        playSecurityChime(audioMutedRef.current, audioVolumeRef.current);
      }
    }
    if (alpr.length > 0) {
      setLiveAlprEvents((prev) => {
        const seen = new Set(alpr.map((e) => e.logId));
        return [...alpr.reverse(), ...prev.filter((e) => !seen.has(e.logId))].slice(0, MAX_ALPR_EVENTS);
      });
      if (alpr.some((e) => e.verdict === 'FLAGGED_WATCHLIST' || e.permitStatus === 'FLAGGED_WATCHLIST')) {
        playSecurityChime(audioMutedRef.current, audioVolumeRef.current);
      }
    }
    if (incidents.length > 0) {
      setLiveIncidents((prev) => {
        const seen = new Set(incidents.map((i) => i.incidentId));
        return [...incidents.reverse(), ...prev.filter((i) => !seen.has(i.incidentId))].slice(0, MAX_INCIDENTS);
      });
    }
    if (cameras.size > 0) {
      setLiveCameras((prev) => {
        const next = prev.slice();
        for (const [id, cam] of cameras) {
          const idx = next.findIndex((c) => c.cameraId === id);
          if (idx >= 0) next[idx] = cam;
          else next.push(cam);
        }
        return next;
      });
    }
    if (guards.size > 0) {
      setLiveGuards((prev) => {
        const next = prev.slice();
        for (const [id, guard] of guards) {
          const idx = next.findIndex((g) => g.guardId === id);
          if (idx >= 0) next[idx] = guard;
          else next.push(guard);
        }
        return next;
      });
    }
    if (lockdown) {
      if (lockdown.clear) {
        setActiveLockdown((prev) => (prev && prev.lockdownId === lockdown!.event.lockdownId ? null : prev));
      } else {
        setActiveLockdown(lockdown.event);
        playSecurityChime(audioMutedRef.current, audioVolumeRef.current);
      }
    }
  }, []);

  // ─── 15fps rAF-throttled flush pipeline ───
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushPendingRef = useRef<() => void>(() => undefined);

  const flushPending = useCallback(() => {
    flushScheduledRef.current = false;
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const now = performance.now();
    const elapsed = now - lastFlushAtRef.current;
    if (elapsed < MAX_FLUSH_INTERVAL_MS && pendingRef.current.length > 0) {
      flushTimerRef.current = setTimeout(() => flushPendingRef.current(), MAX_FLUSH_INTERVAL_MS - elapsed);
      return;
    }
    lastFlushAtRef.current = now;
    const batch = pendingRef.current;
    pendingRef.current = [];
    if (batch.length > 0) reduceIntoState(batch);
  }, [reduceIntoState]);

  useEffect(() => {
    flushPendingRef.current = flushPending;
  }, [flushPending]);

  const enqueueEvent = useCallback((topic: VisionStreamTopic, data: unknown) => {
    lastEventAtRef.current = Date.now();
    pendingRef.current.push({ topic, data });
    if (pendingRef.current.length > 500) {
      pendingRef.current = pendingRef.current.slice(-500);
    }
    if (flushScheduledRef.current) return;
    flushScheduledRef.current = true;
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(flushPending);
    } else {
      window.setTimeout(flushPending, MAX_FLUSH_INTERVAL_MS);
    }
  }, [flushPending]);

  /** Optimistically inject a locally-produced event (e.g. after a gate override). */
  const publishEvent = useCallback(
    <T extends VisionStreamTopic>(topic: T, data: VisionStreamEventMap[T]) => {
      enqueueEvent(topic, data);
    },
    [enqueueEvent]
  );

  // ─── Audio operator controls ───
  useEffect(() => {
    audioMutedRef.current = audioMuted;
  }, [audioMuted]);
  useEffect(() => {
    audioVolumeRef.current = audioVolume;
  }, [audioVolume]);

  useEffect(() => {
    setAudioMutedState(readMutedPreference());
    setAudioVolumeState(readVolumePreference());
  }, []);

  const setAudioMuted = useCallback((muted: boolean) => {
    setAudioMutedState(muted);
    audioMutedRef.current = muted;
    try {
      window.localStorage.setItem(AUDIO_MUTED_KEY, String(muted));
    } catch {}
  }, []);

  const setAudioVolume = useCallback((volume: number) => {
    const clamped = Math.min(Math.max(volume, 0), 1);
    setAudioVolumeState(clamped);
    audioVolumeRef.current = clamped;
    try {
      window.localStorage.setItem(AUDIO_VOLUME_KEY, String(clamped));
    } catch {}
  }, []);

  const toggleAudioMute = useCallback(() => {
    setAudioMuted(!audioMutedRef.current);
  }, [setAudioMuted]);

  // Mirror connectionStatus for the watchdog without re-subscribing.
  const connectionStatusRef = useRef<VisionConnectionStatus>('connecting');
  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  // ─── Connection lifecycle ───
  useEffect(() => {
    if (!enabled) {
      setConnectionStatus('offline');
      return;
    }
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      setConnectionStatus('offline');
      return;
    }

    let disposed = false;
    let watchdog: ReturnType<typeof setInterval> | null = null;

    const stopMock = () => {
      mockRef.current?.stop();
      mockRef.current = null;
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      setConnectionStatus('reconnecting');
      const delay = BACKOFF_DELAYS_MS[Math.min(attemptRef.current, BACKOFF_DELAYS_MS.length - 1)];
      attemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    const startMockFallback = async () => {
      if (disposed || streamMode === 'live') return;
      try {
        const { VisionMockSimulator } = await import(
          '@/lib/operations/vision/streaming/vision-mock-simulator'
        );
        if (disposed) return;
        stopMock();
        const sim = new VisionMockSimulator({
          emit: (topic, data) => enqueueEvent(topic, data),
        });
        mockRef.current = sim;
        sim.start();
        setConnectionStatus('mock');
      } catch {
        setConnectionStatus('offline');
      }
    };

    function connect() {
      if (disposed) return;
      stopMock();

      if (streamMode === 'mock') {
        void startMockFallback();
        return;
      }

      setConnectionStatus(attemptRef.current > 0 ? 'reconnecting' : 'connecting');
      const qs = new URLSearchParams({ topics: topicKey });

      let es: EventSource;
      try {
        es = new EventSource(`${STREAM_PATH}?${qs.toString()}`);
      } catch {
        void startMockFallback();
        return;
      }
      eventSourceRef.current = es;

      const topicsList = topicKey.split(',') as VisionStreamTopic[];

      es.onopen = () => {
        if (disposed) return;
        attemptRef.current = 0;
        lastEventAtRef.current = Date.now();
        setConnectionStatus('connected');
      };

      // Default `message` channel carries the server's `connected` handshake.
      es.onmessage = (e: MessageEvent) => {
        lastEventAtRef.current = Date.now();
        const payload = safeParseJson(e.data);
        if (isPlainObject(payload) && payload.type === 'connected') {
          attemptRef.current = 0;
          setConnectionStatus('connected');
        }
      };

      for (const topic of topicsList) {
        es.addEventListener(topic, (e: MessageEvent) => {
          const payload = safeParseJson((e as MessageEvent).data);
          if (payload !== null) enqueueEvent(topic, payload);
        });
      }
      es.addEventListener('heartbeat', () => {
        lastEventAtRef.current = Date.now();
      });

      es.onerror = () => {
        if (disposed) return;
        es.close();
        if (eventSourceRef.current === es) eventSourceRef.current = null;
        // In auto mode during development, fall back to the simulator after
        // the first hard failure so demos never show a dead cockpit.
        if (streamMode === 'auto' && process.env.NODE_ENV === 'development' && attemptRef.current >= 1) {
          void startMockFallback();
          return;
        }
        scheduleReconnect();
      };
    }

    connect();

    watchdog = setInterval(() => {
      if (disposed) return;
      if (connectionStatusRef.current === 'mock') return;
      if (Date.now() - lastEventAtRef.current > HEARTBEAT_STALE_MS) {
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
        scheduleReconnect();
      }
    }, HEARTBEAT_WATCH_INTERVAL_MS);

    return () => {
      disposed = true;
      if (watchdog) clearInterval(watchdog);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      stopMock();
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      pendingRef.current = [];
      flushScheduledRef.current = false;
    };
    // topicKey is the semantic dependency for the connection identity.
  }, [topicKey, streamMode, enabled, enqueueEvent]);

  const resetBuffers = useCallback(() => {
    pendingRef.current = [];
    setLiveAlerts([]);
    setLiveCameras([]);
    setLiveGuards([]);
    setLiveAlprEvents([]);
    setLiveIncidents([]);
    setActiveLockdown(null);
  }, []);

  return {
    connectionStatus,
    liveAlerts,
    liveCameras,
    liveGuards,
    liveAlprEvents,
    liveIncidents,
    activeLockdown,
    publishEvent,
    resetBuffers,
    audioMuted,
    audioVolume,
    setAudioMuted,
    setAudioVolume,
    toggleAudioMute,
  };
}
