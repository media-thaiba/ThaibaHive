import { spawn, spawnSync } from "child_process";
import { existsSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import crypto from "crypto";

export interface FFmpegCapabilities {
  available: boolean;
  ffmpegVersion?: string;
  ffprobeVersion?: string;
  codecs: string[];
  error?: string;
}

export interface VideoMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
  frameRate: number;
  format: string;
}

export interface TranscodeResult {
  success: boolean;
  outputPath?: string;
  thumbnailPath?: string;
  metadata?: VideoMetadata;
  error?: string;
}

export interface ProxyTranscodeOptions {
  inputPath: string;
  outputPath: string;
  width?: number;
  height?: number;
  videoBitrate?: string;
  audioBitrate?: string;
  preset?: string;
  fastStart?: boolean;
}

export interface ThumbnailOptions {
  inputPath: string;
  outputPath: string;
  timeOffset?: string;
  width?: number;
  height?: number;
  quality?: number;
}

export class VideoTranscoder {
  private ffmpegPath: string;
  private ffprobePath: string;
  private capabilities: FFmpegCapabilities | null = null;
  private tempDir: string;

  constructor() {
    this.ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
    this.ffprobePath = process.env.FFPROBE_PATH || "ffprobe";
    this.tempDir = join(tmpdir(), "mediahive-transcode");
    this.ensureTempDir();
  }

  private ensureTempDir(): void {
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async detectCapabilities(): Promise<FFmpegCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    try {
      const ffmpegResult = spawnSync(this.ffmpegPath, ["-version"], { encoding: "utf8", timeout: 5000 });
      const ffprobeResult = spawnSync(this.ffprobePath, ["-version"], { encoding: "utf8", timeout: 5000 });

      if (ffmpegResult.error || ffprobeResult.error) {
        throw new Error("FFmpeg or ffprobe not found in PATH");
      }

      const ffmpegVersion = ffmpegResult.stdout.split("\n")[0]?.trim();
      const ffprobeVersion = ffprobeResult.stdout.split("\n")[0]?.trim();

      const codecResult = spawnSync(this.ffmpegPath, ["-codecs"], { encoding: "utf8", timeout: 5000 });
      const codecs = codecResult.stdout
        .split("\n")
        .filter((line) => line.startsWith(" D") || line.startsWith(" E"))
        .map((line) => line.trim().split(/\s+/)[1])
        .filter(Boolean);

      this.capabilities = {
        available: true,
        ffmpegVersion,
        ffprobeVersion,
        codecs,
      };

      return this.capabilities;
    } catch (error) {
      this.capabilities = {
        available: false,
        codecs: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
      return this.capabilities;
    }
  }

  async getVideoMetadata(inputPath: string): Promise<VideoMetadata | null> {
    const caps = await this.detectCapabilities();
    if (!caps.available) {
      throw new Error("FFmpeg/ffprobe not available");
    }

    return new Promise((resolve, reject) => {
      const args = [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,codec_name,bit_rate,r_frame_rate,duration",
        "-show_entries", "format=format_name,duration,bit_rate",
        "-of", "json",
        inputPath,
      ];

      const proc = spawn(this.ffprobePath, args, { stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => { stdout += data.toString(); });
      proc.stderr.on("data", (data) => { stderr += data.toString(); });

      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`ffprobe failed: ${stderr}`));
          return;
        }

        try {
          const data = JSON.parse(stdout);
          const stream = data.streams?.[0];
          const format = data.format;

          if (!stream) {
            reject(new Error("No video stream found"));
            return;
          }

          const duration = parseFloat(stream.duration || format.duration || "0");
          const width = stream.width || 0;
          const height = stream.height || 0;
          const codec = stream.codec_name || "unknown";
          const bitrate = parseInt(stream.bit_rate || format.bit_rate || "0", 10);
          
          let frameRate = 0;
          if (stream.r_frame_rate) {
            const [num, den] = stream.r_frame_rate.split("/").map(Number);
            if (den > 0) frameRate = num / den;
          }

          resolve({
            durationSeconds: duration,
            width,
            height,
            codec,
            bitrate,
            frameRate,
            format: format.format_name || "unknown",
          });
        } catch (e) {
          reject(new Error(`Failed to parse ffprobe output: ${e}`));
        }
      });

      proc.on("error", (err) => reject(err));
    });
  }

  async extractThumbnail(options: ThumbnailOptions): Promise<string | null> {
    const caps = await this.detectCapabilities();
    if (!caps.available) {
      throw new Error("FFmpeg not available");
    }

    const {
      inputPath,
      outputPath,
      timeOffset = "00:00:05",
      width = 320,
      height = 180,
      quality = 2,
    } = options;

    const args = [
      "-y",
      "-ss", timeOffset,
      "-i", inputPath,
      "-vframes", "1",
      "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
      "-q:v", quality.toString(),
      outputPath,
    ];

    return new Promise((resolve, reject) => {
      const proc = spawn(this.ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
      let stderr = "";

      proc.stderr.on("data", (data) => { stderr += data.toString(); });

      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Thumbnail extraction failed: ${stderr}`));
          return;
        }
        if (existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          reject(new Error("Thumbnail output file not created"));
        }
      });

      proc.on("error", (err) => reject(err));
    });
  }

  async transcodeToProxy(options: ProxyTranscodeOptions): Promise<string | null> {
    const caps = await this.detectCapabilities();
    if (!caps.available) {
      throw new Error("FFmpeg not available");
    }

    const {
      inputPath,
      outputPath,
      width = 1280,
      height = 720,
      videoBitrate = "1500k",
      audioBitrate = "128k",
      preset = "fast",
      fastStart = true,
    } = options;

    const args = [
      "-y",
      "-i", inputPath,
      "-c:v", "libx264",
      "-preset", preset,
      "-profile:v", "main",
      "-level", "3.1",
      "-b:v", videoBitrate,
      "-maxrate", videoBitrate,
      "-bufsize", `${parseInt(videoBitrate, 10) * 2}k`,
      "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
      "-c:a", "aac",
      "-b:a", audioBitrate,
      "-ac", "2",
      "-ar", "44100",
    ];

    if (fastStart) {
      args.push("-movflags", "+faststart");
    }

    args.push(outputPath);

    return new Promise((resolve, reject) => {
      const proc = spawn(this.ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
      let stderr = "";

      proc.stderr.on("data", (data) => { stderr += data.toString(); });

      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Proxy transcoding failed: ${stderr}`));
          return;
        }
        if (existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          reject(new Error("Proxy output file not created"));
        }
      });

      proc.on("error", (err) => reject(err));
    });
  }

  async processVideo(inputPath: string, assetId: string): Promise<TranscodeResult> {
    const caps = await this.detectCapabilities();
    if (!caps.available) {
      return {
        success: false,
        error: "FFmpeg/ffprobe not available on this system",
      };
    }

    const workDir = join(this.tempDir, assetId);
    if (existsSync(workDir)) {
      rmSync(workDir, { recursive: true, force: true });
    }
    mkdirSync(workDir, { recursive: true });

    try {
      const metadata = await this.getVideoMetadata(inputPath);

      const thumbnailPath = join(workDir, `${assetId}_thumb.jpg`);
      const proxyPath = join(workDir, `${assetId}_proxy.mp4`);

      await this.extractThumbnail({
        inputPath,
        outputPath: thumbnailPath,
        timeOffset: this.calculateThumbnailOffset(metadata!.durationSeconds),
      });

      await this.transcodeToProxy({
        inputPath,
        outputPath: proxyPath,
      });

      return {
        success: true,
        outputPath: proxyPath,
        thumbnailPath,
        metadata: metadata!,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown processing error",
      };
    } finally {
      // Note: We keep temp files for upload; caller should clean up after upload
    }
  }

  private calculateThumbnailOffset(durationSeconds: number): string {
    if (durationSeconds <= 10) {
      return "00:00:01";
    }
    const offset = Math.min(5, durationSeconds * 0.1);
    const hours = Math.floor(offset / 3600);
    const minutes = Math.floor((offset % 3600) / 60);
    const seconds = Math.floor(offset % 60);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  cleanupTempDir(assetId: string): void {
    const workDir = join(this.tempDir, assetId);
    if (existsSync(workDir)) {
      rmSync(workDir, { recursive: true, force: true });
    }
  }

  static generateAssetHash(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  static async generateFileHash(filePath: string): Promise<string> {
    const hash = crypto.createHash("sha256");
    const stream = readFileSync(filePath);
    hash.update(stream);
    return hash.digest("hex");
  }
}

export const videoTranscoder = new VideoTranscoder();
export default videoTranscoder;