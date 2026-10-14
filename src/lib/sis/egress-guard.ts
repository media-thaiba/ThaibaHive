/**
 * SIS Egress Defense & SSRF Guard
 *
 * Implements strict outbound network security for external SIS/LMS connections:
 * - Pre-DNS metadata & internal hostname blocking
 * - Pinned DNS lookup with RFC 1918, link-local, carrier-NAT & IPv6 validation
 * - Per-hop redirect revalidation (prevents open-redirect SSRF bypasses)
 */

import dns from "dns/promises";

export interface EgressValidationResult {
  allowed: boolean;
  reason?: string;
  pinnedIp?: string;
}

const dnsMocks = new Map<string, string[]>();

export class EgressGuard {
  private static readonly METADATA_HOSTNAMES = new Set([
    "169.254.169.254",
    "metadata.google.internal",
    "metadata.tencentyun.com",
    "100.100.100.200",
    "instance-data",
  ]);

  /**
   * Pre-DNS static check to block known cloud metadata and internal hostnames.
   */
  public static isBlockedHostname(hostname: string): boolean {
    const raw = hostname.toLowerCase();
    const lower = raw.startsWith("[") && raw.endsWith("]") ? raw.slice(1, -1) : raw;

    if (this.METADATA_HOSTNAMES.has(lower) || this.METADATA_HOSTNAMES.has(raw)) {
      return true;
    }

    if (
      lower === "localhost" ||
      lower === "127.0.0.1" ||
      lower === "::1" ||
      lower === "0.0.0.0" ||
      lower.endsWith(".local") ||
      lower.endsWith(".internal") ||
      lower.endsWith(".localhost") ||
      lower.endsWith(".arpa")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Checks whether an IPv4 or IPv6 address belongs to private, loopback, link-local, or reserved ranges.
   */
  public static isPrivateOrReservedIp(ip: string): boolean {
    const raw = ip.toLowerCase();
    const lower = raw.startsWith("[") && raw.endsWith("]") ? raw.slice(1, -1) : raw;

    // IPv4 Checks
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = lower.match(ipv4Regex);
    if (match) {
      const [, o1, o2] = match.map(Number);
      if (
        o1 === 10 || // 10.0.0.0/8 (RFC 1918)
        o1 === 127 || // 127.0.0.0/8 (Loopback)
        (o1 === 172 && o2 >= 16 && o2 <= 31) || // 172.16.0.0/12 (RFC 1918)
        (o1 === 192 && o2 === 168) || // 192.168.0.0/16 (RFC 1918)
        (o1 === 169 && o2 === 254) || // 169.254.0.0/16 (Link-local / Cloud metadata)
        (o1 === 100 && o2 >= 64 && o2 <= 127) || // 100.64.0.0/10 (Carrier-grade NAT)
        (o1 === 192 && o2 === 0) || // 192.0.2.0/24 (TEST-NET-1)
        (o1 === 198 && o2 === 51) || // 198.51.100.0/24 (TEST-NET-2)
        (o1 === 203 && o2 === 0) || // 203.0.113.0/24 (TEST-NET-3)
        (o1 >= 224 && o1 <= 239) || // 224.0.0.0/4 (Multicast)
        o1 >= 240 || // 240.0.0.0/4 (Reserved)
        o1 === 0 // 0.0.0.0/8
      ) {
        return true;
      }
      return false;
    }

    // IPv6 Checks
    if (
      lower === "::1" ||
      lower === "::" ||
      lower.startsWith("fc") || // Unique local address (fc00::/7)
      lower.startsWith("fd") ||
      lower.startsWith("fe80") || // Link-local address (fe80::/10)
      lower.startsWith("ff") || // Multicast address (ff00::/8)
      lower.startsWith("2001:db8") // Documentation
    ) {
      return true;
    }

    return false;
  }

  /**
   * Validates a target egress URL with pre-DNS check and pinned DNS resolution.
   */
  public static async validateEgressUrl(urlStr: string): Promise<EgressValidationResult> {
    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch {
      return { allowed: false, reason: `Malformed URL: '${urlStr}'` };
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return {
        allowed: false,
        reason: `Disallowed protocol '${parsed.protocol}'. Only HTTP/HTTPS egress is permitted.`,
      };
    }

    const rawHostname = parsed.hostname.toLowerCase();
    const hostname = rawHostname.startsWith("[") && rawHostname.endsWith("]")
      ? rawHostname.slice(1, -1)
      : rawHostname;

    // 1. Pre-DNS hostname check
    if (this.isBlockedHostname(rawHostname) || this.isBlockedHostname(hostname)) {
      return {
        allowed: false,
        reason: `Blocked destination hostname '${rawHostname}' (SSRF metadata/loopback protection).`,
      };
    }

    // 2. Immediate IP check if hostname is already a raw literal IP
    if (this.isPrivateOrReservedIp(hostname)) {
      return {
        allowed: false,
        reason: `Target IP '${rawHostname}' is a private or reserved address (SSRF defense).`,
      };
    }

    // 3. DNS Lookup with IP Pinning
    try {
      let resolvedIps: string[] = [];

      if (dnsMocks.has(hostname) || dnsMocks.has(rawHostname)) {
        resolvedIps = (dnsMocks.get(hostname) || dnsMocks.get(rawHostname))!;
      } else {
        const records = await dns.lookup(hostname, { all: true });
        resolvedIps = records.map((r) => r.address);
      }

      if (resolvedIps.length === 0) {
        return { allowed: false, reason: `DNS resolution returned 0 addresses for '${hostname}'.` };
      }

      // Ensure NO resolved IP is private or reserved
      for (const ip of resolvedIps) {
        if (this.isPrivateOrReservedIp(ip)) {
          return {
            allowed: false,
            reason: `DNS resolution for '${hostname}' resolved to private address '${ip}' (SSRF defense).`,
          };
        }
      }

      return {
        allowed: true,
        pinnedIp: resolvedIps[0],
      };
    } catch (err: any) {
      // If DNS resolution fails, fail closed
      return {
        allowed: false,
        reason: `DNS lookup failed for '${hostname}': ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Performs an egress fetch with per-hop redirect revalidation and pinned SSRF checks.
   */
  public static async safeFetch(
    urlStr: string,
    options: RequestInit = {},
    maxRedirects = 3
  ): Promise<Response> {
    let currentUrl = urlStr;
    let redirectsCount = 0;

    while (redirectsCount <= maxRedirects) {
      const validation = await this.validateEgressUrl(currentUrl);
      if (!validation.allowed) {
        throw new Error(`SSRF Blocked: ${validation.reason}`);
      }

      const res = await fetch(currentUrl, {
        ...options,
        redirect: "manual",
      });

      // Handle redirects with per-hop revalidation
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get("location");
        if (!location) {
          return res;
        }

        const nextUrl = new URL(location, currentUrl).toString();
        redirectsCount++;

        if (redirectsCount > maxRedirects) {
          throw new Error(`SSRF Blocked: Maximum redirect limit (${maxRedirects}) exceeded.`);
        }

        currentUrl = nextUrl;
        continue;
      }

      return res;
    }

    throw new Error(`SSRF Blocked: Redirect loop detected.`);
  }

  /**
   * Test helper to register mocked DNS resolutions.
   */
  public static setDnsMock(hostname: string, ips: string[] | null): void {
    const raw = hostname.toLowerCase();
    const clean = raw.startsWith("[") && raw.endsWith("]") ? raw.slice(1, -1) : raw;
    if (ips === null) {
      dnsMocks.delete(raw);
      dnsMocks.delete(clean);
    } else {
      dnsMocks.set(raw, ips);
      dnsMocks.set(clean, ips);
    }
  }

  /**
   * Test helper to clear all mocked DNS resolutions.
   */
  public static clearDnsMocks(): void {
    dnsMocks.clear();
  }
}
