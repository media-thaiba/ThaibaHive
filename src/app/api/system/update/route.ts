import { NextResponse } from "next/server";
import { db } from "@/db";
import { systemConfigs } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { ensureArray } from "@/lib/utils";
import { systemUpdatePostSchema } from "@/lib/validation/schemas";

import fs from "fs";
import path from "path";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

interface ReleaseMetadata {
  latestVersion: string;
  downloadUrl: string;
  releaseNotes: string;
  forceUpdate: boolean;
  sha256?: string;
  fileSize?: number;
}

function loadDefaultReleaseMetadata(): ReleaseMetadata {
  try {
    const metaPath = path.join(process.cwd(), "src/config/release-metadata.json");
    if (fs.existsSync(metaPath)) {
      const parsed = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      return {
        latestVersion: parsed.latestVersion || "3.20.0+15",
        downloadUrl: parsed.downloadUrl || "/downloads/ThaibaHive_latest.apk",
        releaseNotes: parsed.releaseNotes || "General stability fixes and performance improvements.",
        forceUpdate: !!parsed.forceUpdate,
        sha256: parsed.sha256 || "",
        fileSize: typeof parsed.fileSize === "number" ? parsed.fileSize : 0,
      };
    }
  } catch {
    // Fall back to safe defaults
  }
  return {
    latestVersion: "3.20.0+15",
    downloadUrl: "/downloads/ThaibaHive_latest.apk",
    releaseNotes: "General stability fixes and performance improvements.",
    forceUpdate: false,
    sha256: "",
    fileSize: 0,
  };
}

export async function GET(_request: Request) {
  try {
    const rawConfigs = await db
      .select()
      .from(systemConfigs)
      .where(
        inArray(systemConfigs.key, [
          "app_latest_version",
          "app_download_url",
          "app_release_notes",
          "app_force_update",
          "app_sha256",
          "app_file_size",
        ])
      );
    const configs = ensureArray(rawConfigs) as Array<{ key: string; value: string }>;

    const defaultMeta = loadDefaultReleaseMetadata();

    const configMap: Record<string, string> = {
      app_latest_version: defaultMeta.latestVersion,
      app_download_url: defaultMeta.downloadUrl,
      app_release_notes: defaultMeta.releaseNotes,
      app_force_update: defaultMeta.forceUpdate ? "true" : "false",
      app_sha256: defaultMeta.sha256 || "",
      app_file_size: defaultMeta.fileSize ? String(defaultMeta.fileSize) : "0",
    };

    for (const item of configs) {
      if (item.key && item.value) {
        configMap[item.key] = item.value;
      }
    }

    let downloadUrl = configMap.app_download_url;
    let computedSha256 = configMap.app_sha256;
    let computedFileSize = parseInt(configMap.app_file_size, 10) || 0;

    // If downloadUrl is relative, check local filesystem for sha256 and size if not already configured
    if (downloadUrl && downloadUrl.startsWith("/")) {
      const localFilePath = path.join(process.cwd(), "public", downloadUrl.replace(/^\//, ""));
      if (fs.existsSync(localFilePath)) {
        const stats = fs.statSync(localFilePath);
        if (!computedFileSize || computedFileSize === 0) {
          computedFileSize = stats.size;
        }
        if (!computedSha256 || computedSha256 === "") {
          const fileBuffer = fs.readFileSync(localFilePath);
          computedSha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
        }
      }

      const baseOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://thaibahive.com";
      const cleanBase = baseOrigin.replace(/\/$/, "");
      downloadUrl = `${cleanBase}${downloadUrl}`;
    }

    return NextResponse.json(
      {
        latestVersion: configMap.app_latest_version,
        downloadUrl: downloadUrl,
        releaseNotes: configMap.app_release_notes,
        forceUpdate: configMap.app_force_update === "true",
        sha256: computedSha256,
        fileSize: computedFileSize,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error) {
    console.error("System update check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.SYSTEM_UPDATE_SECRET;

    if (!secret || secret.trim() === "") {
      console.error("System update configure error: SYSTEM_UPDATE_SECRET is not configured or is empty.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = systemUpdatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
    }

    const { version, downloadUrl, releaseNotes, isForceUpdate, sha256, fileSize } = parsed.data;

    const updates: Array<{ key: string; value: string }> = [];
    if (version) updates.push({ key: "app_latest_version", value: version });
    if (downloadUrl) updates.push({ key: "app_download_url", value: downloadUrl });
    if (releaseNotes) updates.push({ key: "app_release_notes", value: releaseNotes });
    if (typeof isForceUpdate === "boolean") updates.push({ key: "app_force_update", value: isForceUpdate ? "true" : "false" });
    if (sha256) updates.push({ key: "app_sha256", value: sha256 });
    if (typeof fileSize === "number") updates.push({ key: "app_file_size", value: String(fileSize) });

    for (const item of updates) {
      await db
        .insert(systemConfigs)
        .values({
          key: item.key,
          value: item.value,
        })
        .onConflictDoUpdate({
          target: systemConfigs.key,
          set: { value: item.value },
        })
        .run();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("System update configure error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
