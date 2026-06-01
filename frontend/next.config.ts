import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  skipTrailingSlashRedirect: true,
  experimental: { serverActions: { allowedOrigins: ["*"] } },
};

export default nextConfig;
