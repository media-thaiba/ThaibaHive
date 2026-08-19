/**
 * @module RouteNormalizer
 * Normalizes high-cardinality dynamic URL paths into standardized route templates.
 * Prevents metric label explosion (e.g. /api/students/123 -> /api/students/:id).
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CUID_REGEX = /^c[0-9a-z]{20,32}$/i;
const PREFIXED_ID_REGEX = /^(?:[a-z]{2,5}_)[0-9a-z]{8,32}$/i;
const ALPHANUMERIC_ID_REGEX = /^(?=.*[0-9])(?=.*[a-z])[0-9a-z]{8,36}$/i;
const NUMERIC_ID_REGEX = /^\d+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HEX_HASH_REGEX = /^(?=.*[0-9])[0-9a-f]{24,64}$/i;

/**
 * Normalize an arbitrary request URL path into a canonical metric route label.
 */
export function normalizeRoutePath(rawPath: string): string {
  if (!rawPath) return "/";

  // 1. Strip query params and hash
  let cleanPath = rawPath.split("?")[0].split("#")[0];

  // 2. Remove multiple slashes and trim trailing slash (except for root "/")
  cleanPath = cleanPath.replace(/\/+/g, "/");
  if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
    cleanPath = cleanPath.slice(0, -1);
  }

  // 3. Fast path: if not an API route or shell route with segments, return as-is
  const segments = cleanPath.split("/").filter(Boolean);
  if (segments.length === 0) return "/";

  const normalizedSegments = segments.map((seg, idx) => {
    // Keep first segments literal (e.g. 'api', 'students', 'departments', 'auth')
    if (idx === 0 && seg === "api") return seg;

    if (UUID_REGEX.test(seg)) {
      return ":uuid";
    }
    if (DATE_REGEX.test(seg)) {
      return ":date";
    }
    if (NUMERIC_ID_REGEX.test(seg)) {
      return ":id";
    }
    if (HEX_HASH_REGEX.test(seg)) {
      return ":token";
    }
    if (CUID_REGEX.test(seg) || PREFIXED_ID_REGEX.test(seg) || (ALPHANUMERIC_ID_REGEX.test(seg) && idx > 1)) {
      return ":id";
    }

    return seg;
  });

  return "/" + normalizedSegments.join("/");
}
