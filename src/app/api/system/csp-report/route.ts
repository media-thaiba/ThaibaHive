/**
 * CSP Violation Report Collector (Phase 7 SEC hardening).
 * Browsers POST violation reports here via `report-uri`/`report-to`.
 * Public endpoint (no auth — reports come from user browsers), but
 * bounded in size, rate-limited per IP, and only summarized in logs.
 */


const MAX_BODY_BYTES = 64 * 1024;
const rateBuckets = new Map<string, number>();
const RATE_LIMIT = 20;
const WINDOW_MS = 60_000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || 0;
  if (now - bucket > WINDOW_MS) {
    rateBuckets.set(ip, now);
    return false;
  }
  const count = bucket + 1;
  rateBuckets.set(ip, count);
  return count > RATE_LIMIT;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return new Response(null, { status: 429 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(null, { status: 413 });
  }

  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return new Response(null, { status: 413 });
    }
    const parsed = JSON.parse(raw);
    const reports = Array.isArray(parsed) ? parsed : [parsed];
    for (const report of reports) {
      const body = report?.["csp-report"] || report;
      if (!body) continue;
      console.warn(
        `[CSP-REPORT] directive=${body["effective-directive"] || "unknown"} ` +
          `policy=${body["disposition"] || "enforce"} blocked=${String(body["blocked-uri"] || "?").slice(0, 120)}`
      );
    }
  } catch {
    return new Response(null, { status: 400 });
  }

  return new Response(null, { status: 204 });
}