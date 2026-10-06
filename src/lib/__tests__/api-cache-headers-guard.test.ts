import fs from "node:fs";
import path from "node:path";
import nextConfig from "../../../next.config";

describe("API Cache-Control Security Guard", () => {
  const rootDir = process.cwd();
  const apiDir = path.resolve(rootDir, "src/app/api");

  function getRouteFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getRouteFiles(fullPath));
      } else if (entry.isFile() && (entry.name === "route.ts" || entry.name === "route.js")) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it("ensures no requireAuth route receives public, s-maxage, or stale-while-revalidate cache headers", async () => {
    const routeFiles = getRouteFiles(apiDir);
    const headersConfig = typeof nextConfig.headers === "function" ? await nextConfig.headers() : [];
    
    const violations: string[] = [];

    // 1. Check next.config.ts header rules
    for (const rule of headersConfig) {
      const cacheControlHeader = rule.headers.find(
        (h: { key: string; value: string }) => h.key.toLowerCase() === "cache-control"
      );
      if (cacheControlHeader) {
        const val = cacheControlHeader.value.toLowerCase();
        const hasSMaxAge = val.includes("s-maxage");
        const isPublic = val.includes("public");
        const hasSwr = val.includes("stale-while-revalidate");

        if (hasSMaxAge || isPublic || hasSwr) {
          // If source matches api routes, check if it covers requireAuth routes
          if (rule.source.includes("/api/")) {
            violations.push(
              `next.config.ts rule source "${rule.source}" assigns cache header "${cacheControlHeader.value}" to API routes.`
            );
          }
        }
      }
    }

    // 2. Check individual route files using requireAuth
    for (const filePath of routeFiles) {
      const content = fs.readFileSync(filePath, "utf8");
      const relativePath = path.relative(rootDir, filePath).replace(/\\/g, "/");

      if (content.includes("requireAuth(")) {
        // Must not explicitly set public or s-maxage Cache-Control
        const cacheMatch = content.match(/["']Cache-Control["']\s*:\s*["']([^"']+)["']/i) ||
                           content.match(/headers\.set\(["']Cache-Control["'],\s*["']([^"']+)["']\)/i);
        if (cacheMatch) {
          const val = cacheMatch[1].toLowerCase();
          if (val.includes("public") || val.includes("s-maxage")) {
            violations.push(
              `${relativePath} uses requireAuth but sets Cache-Control to "${cacheMatch[1]}".`
            );
          }
        }
      }
    }

    if (violations.length > 0) {
      console.error("Cache Header Violations Found:\n" + violations.map(v => `  - ${v}`).join("\n"));
    }

    expect(violations).toEqual([]);
  });

  it("ensures default Cache-Control for /api/:path* in next.config.ts is private, no-store", async () => {
    const headersConfig = typeof nextConfig.headers === "function" ? await nextConfig.headers() : [];
    const defaultApiRule = headersConfig.find(
      (r: { source: string }) => r.source === "/api/:path*" || r.source === "/api/(.*)"
    );

    expect(defaultApiRule).toBeDefined();
    const cacheHeader = defaultApiRule?.headers.find(
      (h: { key: string; value: string }) => h.key.toLowerCase() === "cache-control"
    );
    expect(cacheHeader?.value).toBe("private, no-store");
  });
});
