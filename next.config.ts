import path from "path";
import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { securityHeaderPairs } from "./src/lib/security/security-headers";
import { LEGACY_REDIRECTS } from "./src/lib/navigation/legacy-redirects";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
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

  turbopack: {
    root: path.resolve(__dirname),
  },

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
      "@tanstack/react-query",
      "recharts",
      "framer-motion",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "sonner",
    ],
  },

  async redirects() {
    // Phase 1.5: legacy → workspace permanent (308) redirects.
    // Array order = evaluation order; LEGACY_REDIRECTS is pre-sorted
    // (specific rules before folder wildcards). Runs before the filesystem
    // and before the auth proxy.
    return LEGACY_REDIRECTS.map(({ source, destination }) => ({
      source,
      destination,
      permanent: true,
    }));
  },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
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
        headers: securityHeaderPairs(),
      },
    ];
  },
};

export default bundleAnalyzer(nextConfig);