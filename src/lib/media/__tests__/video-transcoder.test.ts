import { videoTranscoder, VideoTranscoder } from "../video-transcoder";

jest.mock("child_process", () => ({
  spawnSync: jest.fn(),
  spawn: jest.fn(),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock("os", () => ({
  tmpdir: jest.fn(() => "/tmp"),
}));

jest.mock("path", () => ({
  join: jest.fn((...args) => args.join("/")),
}));

import { spawnSync, spawn } from "child_process";
import { existsSync, mkdirSync, rmSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("VideoTranscoder", () => {
  const mockSpawn = spawn as jest.Mock;
  const mockSpawnSync = spawnSync as jest.Mock;

  function resetCapabilities() {
    (videoTranscoder as any).capabilities = null;
  }

  function setupAvailableFFmpeg() {
    resetCapabilities();
    mockSpawnSync
      .mockReturnValueOnce({
        error: null,
        stdout: "ffmpeg version 6.0\nCopyright (c) 2000-2023",
        stderr: "",
      })
      .mockReturnValueOnce({
        error: null,
        stdout: "ffprobe version 6.0\nCopyright (c) 2007-2023",
        stderr: "",
      })
      .mockReturnValueOnce({
        error: null,
        stdout: " D.V.L. h264\n D.V.L. hevc\n D.A.L. aac\n",
        stderr: "",
      });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (existsSync as jest.Mock).mockReturnValue(false);
    (mkdirSync as jest.Mock).mockImplementation(() => {});
    (rmSync as jest.Mock).mockImplementation(() => {});
    (readFileSync as jest.Mock).mockReturnValue(Buffer.from("test"));
    (tmpdir as jest.Mock).mockReturnValue("/tmp");
    (join as jest.Mock).mockImplementation((...args) => args.join("/"));
    resetCapabilities();
  });

  describe("detectCapabilities", () => {
    it("returns available capabilities when ffmpeg and ffprobe are found", async () => {
      setupAvailableFFmpeg();

      const caps = await videoTranscoder.detectCapabilities();

      expect(caps.available).toBe(true);
      expect(caps.ffmpegVersion).toBe("ffmpeg version 6.0");
      expect(caps.ffprobeVersion).toBe("ffprobe version 6.0");
      expect(caps.codecs).toContain("h264");
      expect(caps.codecs).toContain("hevc");
      expect(caps.codecs).toContain("aac");
    });

    it("returns unavailable when ffmpeg is not found", async () => {
      resetCapabilities();
      mockSpawnSync
        .mockReturnValueOnce({
          error: new Error("ENOENT"),
          stdout: "",
          stderr: "",
        })
        .mockReturnValueOnce({
          error: null,
          stdout: "ffprobe version 6.0\n",
          stderr: "",
        })
        .mockReturnValueOnce({
          error: null,
          stdout: " D.V.L. h264\n",
          stderr: "",
        });

      const caps = await videoTranscoder.detectCapabilities();

      expect(caps.available).toBe(false);
      expect(caps.error).toBeDefined();
    });

    it("caches capabilities after first detection", async () => {
      setupAvailableFFmpeg();

      await videoTranscoder.detectCapabilities();
      const caps2 = await videoTranscoder.detectCapabilities();

      expect(caps2).toEqual(await videoTranscoder.detectCapabilities());
      expect(mockSpawnSync).toHaveBeenCalledTimes(3);
    });
  });

  describe("getVideoMetadata", () => {
    beforeEach(() => {
      setupAvailableFFmpeg();
    });

    it("parses ffprobe JSON output correctly", async () => {
      const mockProc = {
        stdout: { on: jest.fn((event, cb) => { if (event === "data") cb(Buffer.from(JSON.stringify({ streams: [{ width: 1920, height: 1080, codec_name: "h264", bit_rate: "5000000", r_frame_rate: "30/1", duration: "120.5" }], format: { format_name: "mov,mp4,m4a,3gp,3g2,mj2", duration: "120.5", bit_rate: "5200000" }}))) }) },
        stderr: { on: jest.fn() },
        on: jest.fn((event, cb) => { if (event === "close") cb(0); }),
      };

      mockSpawn.mockReturnValue(mockProc);

      const metadata = await videoTranscoder.getVideoMetadata("/fake/path/video.mp4");

      expect(metadata).toEqual({
        durationSeconds: 120.5,
        width: 1920,
        height: 1080,
        codec: "h264",
        bitrate: 5000000,
        frameRate: 30,
        format: "mov,mp4,m4a,3gp,3g2,mj2",
      });
    });

    it("throws when no video stream found", async () => {
      const mockProc = {
        stdout: { on: jest.fn((event, cb) => { if (event === "data") cb(Buffer.from(JSON.stringify({ streams: [], format: {} }))) }) },
        stderr: { on: jest.fn() },
        on: jest.fn((event, cb) => { if (event === "close") cb(0); }),
      };

      mockSpawn.mockReturnValue(mockProc);

      await expect(videoTranscoder.getVideoMetadata("/fake/path/video.mp4"))
        .rejects.toThrow("No video stream found");
    });

    it("throws when ffprobe fails", async () => {
      const mockProc = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn((event, cb) => { if (event === "data") cb(Buffer.from("error")) }) },
        on: jest.fn((event, cb) => { if (event === "close") cb(1); }),
      };

      mockSpawn.mockReturnValue(mockProc);

      await expect(videoTranscoder.getVideoMetadata("/fake/path/video.mp4"))
        .rejects.toThrow("ffprobe failed");
    });
  });

  describe("extractThumbnail", () => {
    beforeEach(() => {
      setupAvailableFFmpeg();
    });

    it("extracts thumbnail successfully", async () => {
      const mockProc = {
        stderr: { on: jest.fn() },
        on: jest.fn((event, cb) => { if (event === "close") cb(0); }),
      };

      mockSpawn.mockReturnValue(mockProc);
      (existsSync as jest.Mock).mockReturnValue(true);

      const result = await videoTranscoder.extractThumbnail({
        inputPath: "/fake/input.mp4",
        outputPath: "/fake/thumb.jpg",
      });

      expect(result).toBe("/fake/thumb.jpg");
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          "-y", "-ss", "00:00:05", "-i", "/fake/input.mp4",
          "-vframes", "1", "-vf", expect.stringContaining("scale"),
          "-q:v", "2", "/fake/thumb.jpg"
        ]),
        expect.any(Object)
      );
    });

    it("throws when ffmpeg fails", async () => {
      const mockProc = {
        stderr: { on: jest.fn((event, cb) => { if (event === "data") cb(Buffer.from("error")) }) },
        on: jest.fn((event, cb) => { if (event === "close") cb(1); }),
      };

      mockSpawn.mockReturnValue(mockProc);

      await expect(videoTranscoder.extractThumbnail({
        inputPath: "/fake/input.mp4",
        outputPath: "/fake/thumb.jpg",
      })).rejects.toThrow("Thumbnail extraction failed");
    });
  });

  describe("transcodeToProxy", () => {
    beforeEach(() => {
      setupAvailableFFmpeg();
    });

    it("transcodes to proxy successfully", async () => {
      const mockProc = {
        stderr: { on: jest.fn() },
        on: jest.fn((event, cb) => { if (event === "close") cb(0); }),
      };

      mockSpawn.mockReturnValue(mockProc);
      (existsSync as jest.Mock).mockReturnValue(true);

      const result = await videoTranscoder.transcodeToProxy({
        inputPath: "/fake/input.mp4",
        outputPath: "/fake/proxy.mp4",
      });

      expect(result).toBe("/fake/proxy.mp4");
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          "-y", "-i", "/fake/input.mp4",
          "-c:v", "libx264", "-preset", "fast", "-profile:v", "main",
          "-level", "3.1", "-b:v", "1500k", "-maxrate", "1500k",
          "-movflags", "+faststart", "/fake/proxy.mp4"
        ]),
        expect.any(Object)
      );
    });

    it("includes faststart flag by default", async () => {
      const mockProc = {
        stderr: { on: jest.fn() },
        on: jest.fn((event, cb) => { if (event === "close") cb(0); }),
      };

      mockSpawn.mockReturnValue(mockProc);
      (existsSync as jest.Mock).mockReturnValue(true);

      await videoTranscoder.transcodeToProxy({
        inputPath: "/fake/input.mp4",
        outputPath: "/fake/proxy.mp4",
        fastStart: true,
      });

      const callArgs = mockSpawn.mock.calls[0][1];
      expect(callArgs).toContain("-movflags");
      expect(callArgs).toContain("+faststart");
    });
  });

  describe("processVideo", () => {
    it("returns error when ffmpeg not available", async () => {
      resetCapabilities();
      const caps = await videoTranscoder.detectCapabilities();
      caps.available = false;
      caps.error = "FFmpeg not found";

      const result = await videoTranscoder.processVideo("/fake/input.mp4", "asset-123");

      expect(result.success).toBe(false);
      expect(result.error).toContain("FFmpeg");
    });

    it("calls extractThumbnail and transcodeToProxy when available", async () => {
      setupAvailableFFmpeg();

      const mockThumbProc = {
        stderr: { on: jest.fn() },
        on: jest.fn((event, cb) => { if (event === "close") cb(0); }),
      };
      const mockTranscodeProc = {
        stderr: { on: jest.fn() },
        on: jest.fn((event, cb) => { if (event === "close") cb(0); }),
      };

      mockSpawn
        .mockReturnValueOnce(mockThumbProc)
        .mockReturnValueOnce(mockTranscodeProc);

      (existsSync as jest.Mock).mockReturnValue(true);

      jest.spyOn(videoTranscoder as any, "getVideoMetadata").mockResolvedValue({
        durationSeconds: 120,
        width: 1920,
        height: 1080,
        codec: "h264",
        bitrate: 5000000,
        frameRate: 30,
        format: "mp4",
      });

      const result = await videoTranscoder.processVideo("/fake/input.mp4", "asset-123");

      expect(result.success).toBe(true);
      expect(result.outputPath).toBeDefined();
      expect(result.thumbnailPath).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe("generateAssetHash", () => {
    it("generates consistent SHA256 hash", () => {
      const buffer = Buffer.from("test data");
      const hash1 = VideoTranscoder.generateAssetHash(buffer);
      const hash2 = VideoTranscoder.generateAssetHash(buffer);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });

  describe("generateFileHash", () => {
    it("generates hash from file", async () => {
      (readFileSync as jest.Mock).mockReturnValue(Buffer.from("file content"));
      
      const hash = await VideoTranscoder.generateFileHash("/fake/file.mp4");
      
      expect(hash).toHaveLength(64);
    });
  });

  describe("calculateThumbnailOffset", () => {
    it("returns 1 second for short videos", () => {
      const transcoderInstance = videoTranscoder as any;
      expect(transcoderInstance.calculateThumbnailOffset(5)).toBe("00:00:01");
      expect(transcoderInstance.calculateThumbnailOffset(10)).toBe("00:00:01");
    });

    it("returns 5 seconds for videos over 50 seconds (capped)", () => {
      const transcoderInstance = videoTranscoder as any;
      expect(transcoderInstance.calculateThumbnailOffset(100)).toBe("00:00:05");
      expect(transcoderInstance.calculateThumbnailOffset(600)).toBe("00:00:05");
    });

    it("calculates correct offset for medium videos", () => {
      const transcoderInstance = videoTranscoder as any;
      expect(transcoderInstance.calculateThumbnailOffset(30)).toBe("00:00:03");
      expect(transcoderInstance.calculateThumbnailOffset(45)).toBe("00:00:04");
    });
  });
});