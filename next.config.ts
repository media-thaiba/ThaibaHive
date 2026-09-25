import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isProd = process.env.NODE_ENV === "production";
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline';"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval';";

const cspDirective = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https: ws: wss:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "report-uri /api/system/csp-report",
  "report-to csp-endpoint",
].join("; ");

// Security Headers Reference:
// Content-Security-Policy: default-src 'self' script-src 'self' style-src 'self' 'unsafe-inline' img-src 'self' data: https: blob: font-src 'self' data: connect-src 'self' https: ws: wss: frame-ancestors 'none' base-uri 'self' object-src 'none';
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// X-XSS-Protection: 1; mode=block
// Referrer-Policy: strict-origin-when-cross-origin

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: process.env.DEV_ORIGINS?.split(",") || [],
  serverExternalPackages: ["pdfkit"],

  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      const origIgnored = config.watchOptions?.ignored;
      let ignored: any;
      if (origIgnored instanceof RegExp) {
        ignored = new RegExp(origIgnored.source + "|public[\\\\/]exports|sqlite\\.db.*|\\.auth");
      } else if (typeof origIgnored === "string") {
        ignored = [origIgnored, "**/public/exports/**"];
      } else if (Array.isArray(origIgnored)) {
        ignored = [...origIgnored, "**/public/exports/**"];
      } else {
        ignored = /public\/exports/;
      }
      config.watchOptions = {
        ...config.watchOptions,
        ignored,
      };
    }
    return config;
  },

  turbopack: {},

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  compress: true,

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "date-fns",
      "lodash",
    ],
  },

  async headers() {
    return [
      {
        source: "/api/(dashboard|attendance/my|leaves/balances|tasks|approvals|auth/permissions|auth/me|departments|institutions|staff)",
        headers: [
          { key: "Cache-Control", value: "private, s-maxage=30, stale-while-revalidate=60" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: cspDirective },
          { key: "Reporting-Endpoints", value: 'csp-endpoint="/api/system/csp-report"' },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default bundleAnalyzer(nextConfig);
