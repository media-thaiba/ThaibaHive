import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import {
  downloadFromSupabase,
  uploadToSupabase,
  copySupabaseObject,
  deleteFromSupabase,
  isStorageConfigured,
} from "@/lib/storage";

// ─── MP4 Container Walker ───────────────────────────────────────────────────

/**
 * Box types we must recurse into (container boxes).
 * `meta` is included here and handled with its special 4-byte version+flags skip.
 */
const CONTAINER_TYPES = new Set([
  "moov", "trak", "mdia", "minf", "stbl", "udta", "meta", "ilst",
]);

/** Scheme A: QuickTime literal FourCC GPS atoms */
const SCHEME_A_GPS_FOURCCS = new Set(["©xyz", "loci", "location"]);

interface ZeroOp {
  start: number;
  length: number;
}

/**
 * Recursive MP4/MOV container walker.
 * Returns true if the container's structural integrity check passes (sum of
 * child box sizes == container payload length). Returns false on any parse
 * error or integrity failure — callers treat this as a processing failure.
 */
function walkMp4Boxes(
  buf: Buffer,
  offset: number,
  end: number,
  ops: ZeroOp[],
  keysMap: Map<number, string> // Scheme B: index → key name (populated when inside meta/mdta)
): boolean {
  let cursor = offset;

  while (cursor + 8 <= end) {
    const size = buf.readUInt32BE(cursor);
    const fourcc = buf.toString("latin1", cursor + 4, cursor + 8);

    let boxSize: number;
    let headerSize = 8;

    if (size === 1) {
      // largesize: 8-byte uint64 follows the header
      if (cursor + 16 > end) return false;
      const largeSize = buf.readBigUInt64BE(cursor + 8);
      boxSize = Number(largeSize);
      headerSize = 16;
    } else if (size === 0) {
      // Box extends to end of file
      boxSize = end - cursor;
    } else {
      boxSize = size;
    }

    if (boxSize < headerSize || cursor + boxSize > end) return false;

    const payloadStart = cursor + headerSize;
    const payloadEnd = cursor + boxSize;

    if (CONTAINER_TYPES.has(fourcc)) {
      let childStart = payloadStart;

      if (fourcc === "meta") {
        // meta ambiguity: ISO-BMFF has a 4-byte version+flags before children;
        // QuickTime meta does not. Disambiguate by peeking at the next uint32:
        // if it looks like a valid child box size (>= 8 and fits in remaining),
        // treat it as a box size (QuickTime, no skip); otherwise skip 4 bytes (ISO-BMFF).
        if (childStart + 4 <= payloadEnd) {
          const nextU32 = buf.readUInt32BE(childStart);
          const remaining = payloadEnd - childStart;
          if (!(nextU32 >= 8 && nextU32 <= remaining)) {
            // Looks like version+flags — skip them
            childStart += 4;
          }
        }

        // Parse hdlr inside meta to detect the mdta scheme (Scheme B)
        // We do a light pre-scan before full recursion
        parseMetaChildren(buf, childStart, payloadEnd, ops, keysMap);
        // parseMetaChildren handles recursion into ilst/keys itself; skip standard recursion
        cursor += boxSize;
        continue;
      }

      // Standard container: recurse
      const ok = walkMp4Boxes(buf, childStart, payloadEnd, ops, keysMap);
      if (!ok) return false;

      // Structural integrity check: cursor after walk should equal payloadEnd
      // (walkMp4Boxes advances internally; we check the return value for failure)

    } else if (SCHEME_A_GPS_FOURCCS.has(fourcc) || fourcc === "\u00a9xyz") {
      // Scheme A: zero the entire payload
      ops.push({ start: payloadStart, length: payloadEnd - payloadStart });
    }
    // All other types (mdat, ftyp, free, skip, unknown): advance cursor only

    cursor += boxSize;
  }

  // Integrity check: cursor should have consumed exactly the expected range
  return cursor === end;
}

/**
 * Parse inside a `meta` box, detecting handler type and processing
 * both Scheme A (udta children) and Scheme B (mdta keys/ilst).
 */
function parseMetaChildren(
  buf: Buffer,
  start: number,
  end: number,
  ops: ZeroOp[],
  _keysMap: Map<number, string>
): void {
  let cursor = start;
  let isMdta = false;
  const localKeys = new Map<number, string>();

  // First pass: find hdlr and keys atoms
  let c = start;
  while (c + 8 <= end) {
    const size = buf.readUInt32BE(c);
    const fourcc = buf.toString("latin1", c + 4, c + 8);
    if (size < 8 || c + size > end) break;

    if (fourcc === "hdlr") {
      // handler-type is at bytes 8–11 of payload (after 4-byte version+flags)
      const handlerType = buf.toString("latin1", c + 8 + 4, c + 8 + 8);
      if (handlerType === "mdta") isMdta = true;
    }

    if (fourcc === "keys" && isMdta) {
      // keys atom: 4 bytes version+flags, then 4 bytes entry count, then entries
      const entryCount = buf.readUInt32BE(c + 8 + 4);
      let kCursor = c + 8 + 8;
      for (let i = 1; i <= entryCount; i++) {
        if (kCursor + 8 > c + size) break;
        const keySize = buf.readUInt32BE(kCursor);
        // skip 4-byte namespace, then read name string
        const nameStart = kCursor + 8;
        const nameEnd = kCursor + keySize;
        if (nameEnd > c + size) break;
        const keyName = buf.toString("utf8", nameStart, nameEnd);
        localKeys.set(i, keyName);
        kCursor += keySize;
      }
    }

    c += size;
  }

  // Second pass: process ilst with the key map
  cursor = start;
  while (cursor + 8 <= end) {
    const size = buf.readUInt32BE(cursor);
    const fourcc = buf.toString("latin1", cursor + 4, cursor + 8);
    if (size < 8 || cursor + size > end) break;

    if (fourcc === "ilst" && isMdta) {
      // Scheme B: ilst children keyed by numeric index
      let iCursor = cursor + 8;
      const ilstEnd = cursor + size;
      let entryNum = 0;
      while (iCursor + 8 <= ilstEnd) {
        const entrySize = buf.readUInt32BE(iCursor);
        const entryIndex = buf.readUInt32BE(iCursor + 4); // numeric index, not FourCC
        if (entrySize < 8 || iCursor + entrySize > ilstEnd) break;
        entryNum++;

        const keyName = localKeys.get(entryIndex) ?? localKeys.get(entryNum) ?? "";
        if (keyName.includes("location")) {
          // Find data sub-box inside this ilst entry
          let dCursor = iCursor + 8;
          const dEnd = iCursor + entrySize;
          while (dCursor + 8 <= dEnd) {
            const dSize = buf.readUInt32BE(dCursor);
            const dFourcc = buf.toString("latin1", dCursor + 4, dCursor + 8);
            if (dSize < 8 || dCursor + dSize > dEnd) break;
            if (dFourcc === "data") {
              // data atom structure: 8-byte box header + 4-byte type + 4-byte locale + value
              // Zero from byte 16 (past the extra type+locale fields) to preserve atom structure
              const valueStart = dCursor + 16;
              const valueLength = dSize - 16;
              if (valueLength > 0) {
                ops.push({ start: valueStart, length: valueLength });
              }
            }
            dCursor += dSize;
          }
        }
        iCursor += entrySize;
      }
    } else if (fourcc === "ilst" && !isMdta) {
      // Scheme A ilst: check for literal FourCC GPS atoms inside
      let iCursor = cursor + 8;
      const ilstEnd = cursor + size;
      while (iCursor + 8 <= ilstEnd) {
        const entrySize = buf.readUInt32BE(iCursor);
        const entryFourcc = buf.toString("latin1", iCursor + 4, iCursor + 8);
        if (entrySize < 8 || iCursor + entrySize > ilstEnd) break;
        if (SCHEME_A_GPS_FOURCCS.has(entryFourcc)) {
          ops.push({ start: iCursor + 8, length: entrySize - 8 });
        }
        iCursor += entrySize;
      }
    } else if (fourcc === "udta") {
      // udta inside meta — check for Scheme A GPS atoms
      let uCursor = cursor + 8;
      const udtaEnd = cursor + size;
      while (uCursor + 8 <= udtaEnd) {
        const uSize = buf.readUInt32BE(uCursor);
        const uFourcc = buf.toString("latin1", uCursor + 4, uCursor + 8);
        if (uSize < 8 || uCursor + uSize > udtaEnd) break;
        if (SCHEME_A_GPS_FOURCCS.has(uFourcc)) {
          ops.push({ start: uCursor + 8, length: uSize - 8 });
        }
        uCursor += uSize;
      }
    }

    cursor += size;
  }
}

// ─── Webhook Handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-supabase-signature");
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookSecret || !signature) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 401 });
  }

  const rawBody = await req.text();
  const hmac = crypto.createHmac("sha256", webhookSecret);
  const calculatedSignature = hmac.update(rawBody).digest("hex");

  // Timing-safe comparison to prevent timing attacks
  const sig = Buffer.from(signature, "hex");
  const calc = Buffer.from(calculatedSignature, "hex");
  if (sig.length !== calc.length || !crypto.timingSafeEqual(sig, calc)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let assetId: string | undefined;
  let fileUrl: string | undefined;

  try {
    const payload = JSON.parse(rawBody) as {
      type: string;
      table: string;
      record: { id: string; status: string; file_url: string };
    };

    if (
      payload.type !== "INSERT" ||
      payload.table !== "media_assets" ||
      payload.record.status !== "processing"
    ) {
      return NextResponse.json({ message: "Ignored" }, { status: 200 });
    }

    assetId = payload.record.id;
    // file_url from DB uses the snake_case column name in the webhook payload
    fileUrl = payload.record.file_url;

    if (!isStorageConfigured) {
      // In local dev without Supabase, immediately mark ready — no actual file to strip
      await db.update(mediaAssets)
        .set({ status: "ready", updatedAt: new Date().toISOString() })
        .where(eq(mediaAssets.id, assetId))
        .run();
      return NextResponse.json({ success: true, assetId, note: "local-dev: no-op" });
    }

    // Strip the path prefix used in fileUrl (e.g. /api/upload/files/private_tmp/...)
    const storagePath = fileUrl.replace(/^\/api\/upload\/files\//, "");

    // 1. Download video from private_tmp
    const fileData = await downloadFromSupabase(storagePath);
    if (!fileData) {
      throw new Error(`File not found in storage: ${storagePath}`);
    }
    const arrayBuf = await new Response(fileData.stream).arrayBuffer();
    const buf = Buffer.from(arrayBuf);

    // 2. Recursive walk + GPS zeroing
    const ops: ZeroOp[] = [];
    const keysMap = new Map<number, string>();
    const structuralOk = walkMp4Boxes(buf, 0, buf.length, ops, keysMap);

    if (!structuralOk) {
      throw new Error("MP4 structural integrity check failed — possible parse misalignment");
    }

    // 3. Apply zero operations in reverse offset order (preserves earlier offsets)
    ops.sort((a, b) => b.start - a.start);
    for (const op of ops) {
      buf.fill(0x00, op.start, op.start + op.length);
    }

    // 4. Re-upload mutated buffer to same private_tmp path
    await uploadToSupabase(storagePath, fileData.mimeType, buf);

    // 5. Promote: copy to assets path, delete private_tmp
    const assetStoragePath = storagePath.replace("private_tmp", "assets");
    await copySupabaseObject(storagePath, assetStoragePath);
    await deleteFromSupabase([storagePath]);

    // 6. Update DB: mark ready with new public asset URL
    const newFileUrl = `/api/upload/files/${assetStoragePath}`;
    await db.update(mediaAssets)
      .set({ status: "ready", fileUrl: newFileUrl, updatedAt: new Date().toISOString() })
      .where(eq(mediaAssets.id, assetId))
      .run();

    return NextResponse.json({ success: true, assetId, opsApplied: ops.length });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Video processing failed";
    console.error("[process-video] failure:", message, { assetId, fileUrl });

    // Fail-closed: mark asset as failed, clean up private_tmp to prevent GPS-intact leaks
    if (assetId) {
      try {
        await db.update(mediaAssets)
          .set({ status: "failed", updatedAt: new Date().toISOString() })
          .where(eq(mediaAssets.id, assetId))
          .run();
      } catch { /* best-effort */ }
    }
    if (fileUrl && isStorageConfigured) {
      const storagePath = fileUrl.replace(/^\/api\/upload\/files\//, "");
      try {
        await deleteFromSupabase([storagePath]);
      } catch { /* best-effort */ }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
