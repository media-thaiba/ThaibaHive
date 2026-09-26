/**
 * Regional Media Caching Policy & Edge Image Optimizer
 * Part of Sprint-034: Enterprise Multi-Region Infrastructure & Automated Dependency Security
 */

import { getEdgeCacheHeaders } from "@/lib/edge/cache-control";

export interface MediaEdgeOptions {
  id: string;
  isPublic?: boolean;
  institutionId?: string;
  mimeType?: string;
}

export function getMediaEdgeHeaders(options: MediaEdgeOptions): Record<string, string> {
  const isPublic = options.isPublic ?? true;

  if (!isPublic) {
    return getEdgeCacheHeaders("PRIVATE_DYNAMIC");
  }

  const tags = [`media-${options.id}`];
  if (options.institutionId) {
    tags.push(`inst-${options.institutionId}`);
  }

  const headers = getEdgeCacheHeaders("PUBLIC_MEDIA_THUMBNAIL", { tags });

  // Add CDN origin-shield and format negotiation headers
  return {
    ...headers,
    "Vary": "Accept, Accept-Encoding",
    "Cloudflare-CDN-Cache-Control": "public, max-age=604800",
  };
}
