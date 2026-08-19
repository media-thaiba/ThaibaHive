import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { HlsSegmenter } from "@/lib/streaming/hls-segmenter";

const segmenter = new HlsSegmenter();

export const GET = requireAuth(async (request: Request, session, context?: { params: Promise<Record<string, string>> }) => {
  try {
    const params = context ? await context.params : { id: "stream-001" };
    const streamId = params.id;
    const url = new URL(request.url);
    const quality = url.searchParams.get("quality");

    if (!quality) {
      // Return master playlist
      const masterPlaylist = segmenter.generateMasterPlaylist(streamId);
      return new NextResponse(masterPlaylist, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache",
        },
      });
    }

    // Return variant playlist for specific quality
    segmenter.addSegment(streamId, 2.0);
    const variantPlaylist = segmenter.generateVariantPlaylist(streamId);

    return new NextResponse(variantPlaylist, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}, "streaming:access");
