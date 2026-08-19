import { EdgeRequest, EdgeResponse, EdgeContext } from "./types";
import { handleEdgeRequest } from "./worker";

/**
 * Adapter for Cloudflare Workers / Vercel Edge runtime environment.
 * Maps Web Fetch API Request to EdgeRequest and returns standard Web Fetch Response.
 */
export async function webFetchAdapter(
  request: Request,
  cloudflareContext?: { env?: any; waitUntil?: (p: Promise<any>) => void }
): Promise<Response> {
  const urlObj = new URL(request.url);
  const headers: Record<string, string> = {};
  request.headers.forEach((val, key) => {
    headers[key] = val;
  });

  const method = request.method;
  let body: string | undefined;

  if (method !== "GET" && method !== "HEAD") {
    body = await request.text();
  }

  const clientIp = request.headers.get("cf-connecting-ip") || 
                   request.headers.get("x-real-ip") || 
                   request.headers.get("x-forwarded-for")?.split(",")[0].trim() || 
                   "127.0.0.1";

  const region = request.headers.get("cf-ipcountry") || 
                 request.headers.get("x-vercel-ip-country") || 
                 "US";

  const req: EdgeRequest = {
    url: request.url,
    method,
    headers,
    body,
  };

  const ctx: EdgeContext = {
    region,
    clientIp,
    userAgent: request.headers.get("user-agent") || undefined,
    timestamp: Date.now(),
  };

  const edgeRes = await handleEdgeRequest(req, ctx);

  const resHeaders = new Headers();
  Object.entries(edgeRes.headers).forEach(([key, val]) => {
    resHeaders.set(key, val);
    // Shim for MockResponse property accessor in jest.setup.ts
    (resHeaders as any)[key] = val;
    (resHeaders as any)[key.toLowerCase()] = val;
  });

  return new Response(edgeRes.body, {
    status: edgeRes.status,
    headers: resHeaders,
  });
}
