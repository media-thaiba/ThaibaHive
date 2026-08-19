import { usePlaybackStore } from "../observability/playback-state";
import { compressPayload, decompressPayload } from "../observability/compression";
import { PlaybackEvent } from "../observability/playback-engine";

describe("Sprint-022 Visual Playback & Telemetry Compression Test Suite", () => {
  describe("Zustand Playback State Store", () => {
    beforeEach(() => {
      // Reset Zustand store state before each test
      const store = usePlaybackStore.getState();
      store.pause();
      if (store.isPlaybackMode) {
        store.togglePlaybackMode();
      }
      usePlaybackStore.setState({
        events: [],
        currentIndex: -1,
        currentTime: "",
        playbackSpeed: 1,
      });
    });

    test("Initial state is set correctly", () => {
      const store = usePlaybackStore.getState();
      expect(store.isPlaybackMode).toBe(false);
      expect(store.isPlaying).toBe(false);
      expect(store.playbackSpeed).toBe(1);
      expect(store.events).toEqual([]);
      expect(store.currentIndex).toBe(-1);
    });

    test("Toggling playback mode updates state and pauses stream", () => {
      const store = usePlaybackStore.getState();
      
      store.togglePlaybackMode();
      expect(usePlaybackStore.getState().isPlaybackMode).toBe(true);

      store.togglePlaybackMode();
      expect(usePlaybackStore.getState().isPlaybackMode).toBe(false);
      expect(usePlaybackStore.getState().events).toEqual([]);
    });

    test("Timeline stepping and scrubbing works accurately", () => {
      const store = usePlaybackStore.getState();
      const mockEvents: PlaybackEvent[] = [
        { type: "event", timestamp: "2026-08-04T12:00:00.000Z", data: { id: "1", message: "Event 1" } },
        { type: "event", timestamp: "2026-08-04T12:00:05.000Z", data: { id: "2", message: "Event 2" } },
        { type: "metric", timestamp: "2026-08-04T12:00:10.000Z", data: { id: "3", metricName: "m1", metricValue: 10 } },
      ];

      usePlaybackStore.setState({
        events: mockEvents,
        currentIndex: 0,
        currentTime: mockEvents[0].timestamp,
      });

      // Step forward
      store.stepForward();
      expect(usePlaybackStore.getState().currentIndex).toBe(1);
      expect(usePlaybackStore.getState().currentTime).toBe(mockEvents[1].timestamp);

      // Step forward again
      store.stepForward();
      expect(usePlaybackStore.getState().currentIndex).toBe(2);
      expect(usePlaybackStore.getState().currentTime).toBe(mockEvents[2].timestamp);

      // Step forward at the end does nothing
      store.stepForward();
      expect(usePlaybackStore.getState().currentIndex).toBe(2);

      // Step backward
      store.stepBackward();
      expect(usePlaybackStore.getState().currentIndex).toBe(1);
      expect(usePlaybackStore.getState().currentTime).toBe(mockEvents[1].timestamp);

      // Scrub timeline
      store.scrubTimeline(0);
      expect(usePlaybackStore.getState().currentIndex).toBe(0);
      expect(usePlaybackStore.getState().currentTime).toBe(mockEvents[0].timestamp);

      // Scrub out of bounds does nothing
      store.scrubTimeline(99);
      expect(usePlaybackStore.getState().currentIndex).toBe(0);
    });

    test("Playback speed config changes state", () => {
      const store = usePlaybackStore.getState();
      store.setPlaybackSpeed(2);
      expect(usePlaybackStore.getState().playbackSpeed).toBe(2);
    });
  });

  describe("Gzip & Brotli Compression Utilities", () => {
    test("Compresses and decompresses JSON payloads with gzip", async () => {
      const samplePayload = { name: "test-event", count: 123, active: true };
      
      const compressed = await compressPayload(samplePayload, "gzip");
      expect(Buffer.isBuffer(compressed)).toBe(true);
      expect(compressed.length).toBeLessThan(JSON.stringify(samplePayload).length + 50); // compression signature headers overhead is small
      
      const decompressed = await decompressPayload(compressed, "gzip");
      expect(decompressed).toEqual(samplePayload);
    });

    test("Compresses and decompresses JSON payloads with brotli", async () => {
      const samplePayload = { name: "test-event-brotli", count: 456, list: [1, 2, 3] };
      
      const compressed = await compressPayload(samplePayload, "brotli");
      expect(Buffer.isBuffer(compressed)).toBe(true);
      
      const decompressed = await decompressPayload(compressed, "brotli");
      expect(decompressed).toEqual(samplePayload);
    });

    test("Decompress auto-detects gzip format", async () => {
      const samplePayload = { type: "auto-detect", value: 99 };
      const compressed = await compressPayload(samplePayload, "gzip");
      
      const decompressed = await decompressPayload(compressed, "auto");
      expect(decompressed).toEqual(samplePayload);
    });

    test("Decompress fallback parses raw JSON strings without errors", async () => {
      const rawString = '{"raw":true,"message":"Hello"}';
      const parsed = await decompressPayload(rawString, "auto");
      expect(parsed).toEqual({ raw: true, message: "Hello" });
    });

    test("Compression rejects null and undefined payloads", async () => {
      await expect(compressPayload(null as any)).rejects.toThrow();
      await expect(compressPayload(undefined as any)).rejects.toThrow();
    });
  });
});
