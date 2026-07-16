import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: process.env.DEV_ORIGINS?.split(",") || [],
};

export default nextConfig;
