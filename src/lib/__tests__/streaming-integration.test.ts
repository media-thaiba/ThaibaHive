import { WebRtcSignalingManager } from "../streaming/webrtc-signaling";
import { MediaSessionManager } from "../streaming/media-session";
import { HlsSegmenter } from "../streaming/hls-segmenter";
import { StreamRecorder } from "../streaming/stream-recorder";
import { CollaborationBridge } from "../streaming/collaboration-bridge";

describe("Distance Learning Streaming Test Suite", () => {
  describe("GEI-011: WebRTC Signaling & Media Session Manager", () => {
    it("should generate ICE server configuration and create valid signaling messages", () => {
      const manager = new WebRtcSignalingManager();
      const ice = manager.getIceServers();
      expect(ice.length).toBeGreaterThan(0);

      const msg = manager.createSignalingMessage(
        "room-1",
        "prof-1",
        "inst-1",
        "OFFER",
        { sdp: "v=0\r\no=- 12345 2 IN IP4 127.0.0.1", type: "offer" }
      );
      expect(msg.type).toBe("OFFER");
      expect(manager.validateSdpOffer(msg.sdp)).toBe(true);
    });

    it("should enforce room creation and participant capacity limits", () => {
      const mediaManager = new MediaSessionManager();
      const room = mediaManager.createRoom("room-2", "inst-1", "Math Lecture", "prof-1", 2);
      expect(room.participants.size).toBe(1); // Host

      mediaManager.joinRoom("room-2", "stu-1", "inst-1", "ATTENDEE");
      expect(room.participants.size).toBe(2);

      expect(() => {
        mediaManager.joinRoom("room-2", "stu-2", "inst-1", "ATTENDEE");
      }).toThrow(/maximum capacity/);
    });
  });

  describe("GEI-012: HLS Segmenter & Stream Recorder", () => {
    it("should generate valid HLS master and variant playlists", () => {
      const segmenter = new HlsSegmenter();
      segmenter.addSegment("stream-1", 2.0);
      segmenter.addSegment("stream-1", 2.0);

      const master = segmenter.generateMasterPlaylist("stream-1");
      expect(master).toContain("#EXTM3U");
      expect(master).toContain("#EXT-X-STREAM-INF");

      const variant = segmenter.generateVariantPlaylist("stream-1");
      expect(variant).toContain("#EXT-X-TARGETDURATION");
      expect(variant).toContain("#EXTINF:2.000");
    });

    it("should record stream session and produce recording metadata", () => {
      const recorder = new StreamRecorder();
      recorder.startRecording("rec-1", "stream-1", "room-1", "inst-1");
      recorder.recordChunk("rec-1");
      recorder.recordChunk("rec-1");

      const metadata = recorder.stopRecording("rec-1", "stream-1", "room-1", "inst-1");
      expect(metadata.recordingId).toBe("rec-1");
      expect(metadata.recordingUrl).toContain("rec-1.mp4");
      expect(metadata.fileSizeBytes).toBeGreaterThan(0);
    });
  });

  describe("GEI-013: Real-Time Collaboration Bridge", () => {
    it("should manage whiteboard drawing strokes and active polling state", () => {
      const bridge = new CollaborationBridge();
      bridge.addStroke("room-1", { id: "s-1", color: "#FF0000", width: 2, points: [{ x: 10, y: 10 }, { x: 20, y: 20 }] });

      const strokes = bridge.getWhiteboardState("room-1");
      expect(strokes.length).toBe(1);

      const poll = bridge.createPoll("poll-1", "Understood concept?", ["Yes", "No"]);
      const updatedPoll = bridge.castVote("poll-1", 0); // Vote "Yes"
      expect(updatedPoll.votes.get("0")).toBe(1);
    });
  });
});
