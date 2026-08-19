import fs from "fs";
import path from "path";
import zlib from "zlib";
import { promisify } from "util";
import { ForensicSnapshotManifest } from "./types";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export class SnapshotStorageManager {
  private baseDir: string;

  constructor(customBaseDir?: string) {
    this.baseDir = customBaseDir || path.join(process.cwd(), ".compliance-snapshots");
    if (!fs.existsSync(this.baseDir)) {
      try {
        fs.mkdirSync(this.baseDir, { recursive: true });
      } catch {
        // Ignored if unable to create in read-only environment
      }
    }
  }

  /**
   * Compresses and writes snapshot manifest to persistent storage
   */
  async save(manifest: ForensicSnapshotManifest): Promise<string> {
    const filename = `${manifest.tenantId}_${manifest.id}.json.gz`;
    const filePath = path.join(this.baseDir, filename);

    const jsonString = JSON.stringify(manifest);
    const compressed = await gzip(Buffer.from(jsonString, "utf8"));

    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
      fs.writeFileSync(filePath, compressed);
      return `file://${filePath.replace(/\\/g, "/")}`;
    } catch {
      // Return memory URI if disk write fails
      return `mem://${manifest.id}`;
    }
  }

  /**
   * Reads and decompresses snapshot manifest from storage URI
   */
  async load(storageUri: string): Promise<ForensicSnapshotManifest> {
    if (storageUri.startsWith("file://")) {
      const cleanPath = storageUri.replace("file://", "");
      const normalized = path.normalize(cleanPath);
      const buffer = fs.readFileSync(normalized);
      const decompressed = await gunzip(buffer);
      return JSON.parse(decompressed.toString("utf8")) as ForensicSnapshotManifest;
    }

    throw new Error(`Unsupported snapshot storage URI: ${storageUri}`);
  }

  /**
   * Deletes a snapshot from storage
   */
  async delete(storageUri: string): Promise<void> {
    if (storageUri.startsWith("file://")) {
      const cleanPath = storageUri.replace("file://", "");
      const normalized = path.normalize(cleanPath);
      if (fs.existsSync(normalized)) {
        fs.unlinkSync(normalized);
      }
    }
  }

  getBaseDir(): string {
    return this.baseDir;
  }
}

export const snapshotStorageManager = new SnapshotStorageManager();
