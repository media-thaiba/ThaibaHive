import { NextResponse } from "next/server";
import { db } from "@/db";
import { systemConfigs } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { ensureArray } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
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
        ])
      );
    const configs = ensureArray(rawConfigs) as Array<{ key: string; value: string }>;

    const LATEST_BUILD_VERSION = "1.0.0+10";
    const LATEST_DOWNLOAD_URL = "https://github.com/media-thaiba/ThaibaHive/releases/download/v1.0.0+10/ThaibaHive-v1.0.0+10-release.apk";
    const LATEST_RELEASE_NOTES = "New Update (v1.0.0+10): Added interactive Map Location Picker, drag-and-drop pin marker, live geofence radius circle overlay, and manual location confirmation.";

    const configMap = {
      app_latest_version: LATEST_BUILD_VERSION,
      app_download_url: LATEST_DOWNLOAD_URL,
      app_release_notes: LATEST_RELEASE_NOTES,
      app_force_update: "false",
    };

    for (const item of configs) {
      if (item.key && item.value) {
        configMap[item.key as keyof typeof configMap] = item.value;
      }
    }

    // Always enforce at least the current deployment build version (1.0.0+9)
    configMap.app_latest_version = LATEST_BUILD_VERSION;
    configMap.app_download_url = LATEST_DOWNLOAD_URL;
    configMap.app_release_notes = LATEST_RELEASE_NOTES;

    let downloadUrl = configMap.app_download_url;
    if (downloadUrl && downloadUrl.startsWith("/")) {
      const host = request.headers.get("host") || "localhost:3000";
      const protocol = request.headers.get("x-forwarded-proto") || "https";
      downloadUrl = `${protocol}://${host}${downloadUrl}`;
    }

    return NextResponse.json(
      {
        latestVersion: configMap.app_latest_version,
        downloadUrl: downloadUrl,
        releaseNotes: configMap.app_release_notes,
        forceUpdate: configMap.app_force_update === "true",
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

    const { latestVersion, downloadUrl, releaseNotes, forceUpdate } = await request.json();

    const updates = [
      { key: "app_latest_version", value: latestVersion },
      { key: "app_download_url", value: downloadUrl },
      { key: "app_release_notes", value: releaseNotes },
      { key: "app_force_update", value: forceUpdate ? "true" : "false" },
    ];

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
