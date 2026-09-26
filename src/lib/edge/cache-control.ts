/**
 * Multi-Region Edge Caching Policies & Surrogate-Key Header Manager
 * Part of Sprint-034: Enterprise Multi-Region Infrastructure & Automated Dependency Security
 */

export type EdgeCachePolicy = 
  | "PUBLIC_IMMUTABLE"       // Static assets, fonts, client bundles
  | "PUBLIC_SEMI_STATIC"     // Institution catalogs, departments, public courses
  | "PUBLIC_MEDIA_THUMBNAIL" // Public thumbnails, avatars, campus photos
  | "PRIVATE_DYNAMIC";       // Auth, finance, transactions, private user data

export interface EdgeHeaderOptions {
  tags?: string[];
  swrSeconds?: number;
  maxAgeSeconds?: number;
}

export function isEdgeCachingEnabled(): boolean {
  return process.env.EDGE_CACHING_ENABLED !== "false";
}

export function getEdgeCacheHeaders(
  policy: EdgeCachePolicy,
  options: EdgeHeaderOptions = {}
): Record<string, string> {
  if (!isEdgeCachingEnabled() || policy === "PRIVATE_DYNAMIC") {
    return {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "CDN-Cache-Control": "no-store",
    };
  }

  const tags = options.tags || [];
  const tagHeaderValue = tags.join(" ");

  switch (policy) {
    case "PUBLIC_IMMUTABLE": {
      const maxAge = options.maxAgeSeconds ?? 31536000;
      const headers: Record<string, string> = {
        "Cache-Control": `public, max-age=${maxAge}, immutable`,
        "CDN-Cache-Control": `public, max-age=${maxAge}`,
      };
      if (tagHeaderValue) {
        headers["Surrogate-Key"] = tagHeaderValue;
        headers["Cache-Tag"] = tagHeaderValue;
      }
      return headers;
    }

    case "PUBLIC_SEMI_STATIC": {
      const maxAge = options.maxAgeSeconds ?? 60;
      const swr = options.swrSeconds ?? 300;
      const headers: Record<string, string> = {
        "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${swr}`,
        "CDN-Cache-Control": `public, s-maxage=${maxAge * 2}`,
        "Vary": "Accept, Accept-Encoding",
      };
      if (tagHeaderValue) {
        headers["Surrogate-Key"] = tagHeaderValue;
        headers["Cache-Tag"] = tagHeaderValue;
      }
      return headers;
    }

    case "PUBLIC_MEDIA_THUMBNAIL": {
      const maxAge = options.maxAgeSeconds ?? 604800; // 7 days
      const swr = options.swrSeconds ?? 86400; // 1 day
      const headers: Record<string, string> = {
        "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${swr}`,
        "CDN-Cache-Control": `public, max-age=${maxAge}`,
        "Vary": "Accept, Accept-Encoding",
      };
      if (tagHeaderValue) {
        headers["Surrogate-Key"] = tagHeaderValue;
        headers["Cache-Tag"] = tagHeaderValue;
      }
      return headers;
    }
  }
}

export function applyEdgeCaching(
  response: any,
  policy: EdgeCachePolicy,
  options: EdgeHeaderOptions = {}
): any {
  const headers = getEdgeCacheHeaders(policy, options);
  for (const [key, value] of Object.entries(headers)) {
    if (response?.headers?.set) {
      response.headers.set(key, value);
    } else if (response?.headers) {
      response.headers[key] = value;
    }
  }
  return response;
}
