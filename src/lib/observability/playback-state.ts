import { create } from "zustand";
import type { PlaybackEvent } from "./playback-engine";

interface PlaybackState {
  isPlaybackMode: boolean;
  isPlaying: boolean;
  playbackSpeed: number; // 0.5 | 1 | 2 | 5
  currentTime: string;
  startTime: string;
  endTime: string;
  events: PlaybackEvent[];
  currentIndex: number;
  playIntervalId: any | null;

  togglePlaybackMode: () => void;
  setPlaybackRange: (start: string, end: string) => void;
  loadEvents: () => Promise<void>;
  play: () => void;
  pause: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  scrubTimeline: (index: number) => void;
  setPlaybackSpeed: (speed: number) => void;
}


export const usePlaybackStore = create<PlaybackState>((set, get) => {
  const clearCurrentInterval = () => {
    const { playIntervalId } = get();
    if (playIntervalId) {
      clearInterval(playIntervalId);
      set({ playIntervalId: null });
    }
  };

  const startTickInterval = () => {
    clearCurrentInterval();
    const interval = setInterval(() => {
      const { events, currentIndex, stepForward, pause } = get();
      if (currentIndex >= events.length - 1) {
        pause();
      } else {
        stepForward();
      }
    }, 1000 / get().playbackSpeed);
    set({ playIntervalId: interval });
  };

  return {
    isPlaybackMode: false,
    isPlaying: false,
    playbackSpeed: 1,
    currentTime: "",
    startTime: new Date(Date.now() - 3600000).toISOString(), // default last 1 hour
    endTime: new Date().toISOString(),
    events: [],
    currentIndex: -1,
    playIntervalId: null,

    togglePlaybackMode: () => {
      const { isPlaybackMode, pause } = get();
      if (isPlaybackMode) {
        pause();
        set({ isPlaybackMode: false, events: [], currentIndex: -1, currentTime: "" });
      } else {
        set({ isPlaybackMode: true });
      }
    },

    setPlaybackRange: (start, end) => {
      set({ startTime: start, endTime: end });
    },

    loadEvents: async () => {
      const { startTime, endTime, pause } = get();
      pause();
      set({ isPlaying: false, events: [], currentIndex: -1, currentTime: startTime });

      try {
        const res = await fetch(`/api/admin/swarm/playback?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`);
        if (!res.ok) {
          throw new Error("Failed to fetch playback events");
        }
        const data = await res.json();
        const events = data.events || [];
        if (events.length > 0) {
          set({
            events,
            currentIndex: 0,
            currentTime: events[0].timestamp,
          });
        } else {
          set({
            events: [],
            currentIndex: -1,
            currentTime: startTime,
          });
        }
      } catch (err) {
        console.error("[usePlaybackStore] Failed to load playback events:", err);
      }
    },

    play: () => {
      const { events, currentIndex, isPlaying } = get();
      if (events.length === 0 || isPlaying) return;

      // Reset to beginning if at the end
      if (currentIndex >= events.length - 1) {
        set({ currentIndex: 0, currentTime: events[0].timestamp });
      }

      set({ isPlaying: true });
      startTickInterval();
    },

    pause: () => {
      clearCurrentInterval();
      set({ isPlaying: false });
    },

    stepForward: () => {
      const { events, currentIndex } = get();
      if (events.length === 0 || currentIndex >= events.length - 1) return;
      const nextIndex = currentIndex + 1;
      set({
        currentIndex: nextIndex,
        currentTime: events[nextIndex].timestamp,
      });
    },

    stepBackward: () => {
      const { events, currentIndex } = get();
      if (events.length === 0 || currentIndex <= 0) return;
      const prevIndex = currentIndex - 1;
      set({
        currentIndex: prevIndex,
        currentTime: events[prevIndex].timestamp,
      });
    },

    scrubTimeline: (index) => {
      const { events } = get();
      if (events.length === 0 || index < 0 || index >= events.length) return;
      set({
        currentIndex: index,
        currentTime: events[index].timestamp,
      });
    },

    setPlaybackSpeed: (speed) => {
      set({ playbackSpeed: speed });
      const { isPlaying } = get();
      if (isPlaying) {
        startTickInterval();
      }
    },
  };
});

// usePlaybackState Context Hook Wrapper for cleaner encapsulation
export const usePlaybackState = () => {
  const store = usePlaybackStore();
  return store;
};
