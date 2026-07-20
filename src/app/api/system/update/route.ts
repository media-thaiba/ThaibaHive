import { NextResponse } from "next/server";
import { db } from "@/db";
import { systemConfigs } from "@/db/schema";
import { inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const configs = await db
      .select()
      .from(systemConfigs)
      .where(
        inArray(systemConfigs.key, [
          "app_latest_version",
          "app_download_url",
          "app_release_notes",
          "app_force_update",
        ])
      )
      .all();

    const configMap = {
      app_latest_version: "1.0.0+1",
      app_download_url: "",
      app_release_notes: "Initial release of ThaibaHive Mobile App!",
      app_force_update: "false",
    };

    for (const item of configs) {
      configMap[item.key as keyof typeof configMap] = item.value;
    }

    let downloadUrl = configMap.app_download_url;
    if (downloadUrl && downloadUrl.startsWith("/")) {
      const host = request.headers.get("host") || "localhost:3000";
      const protocol = request.headers.get("x-forwarded-proto") || "http";
      downloadUrl = `${protocol}://${host}${downloadUrl}`;
    }

    return NextResponse.json({
      latestVersion: configMap.app_latest_version,
      downloadUrl: downloadUrl,
      releaseNotes: configMap.app_release_notes,
      forceUpdate: configMap.app_force_update === "true",
    });
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
