import type { NextConfig } from "next";

function backendOrigin(): string {
  const raw =
    process.env.API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "http://localhost:8000/api";
  return raw.replace(/\/api\/?$/, "");
}

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: { serverActions: { allowedOrigins: ["*"] } },
  async rewrites() {
    const origin = backendOrigin();
    return [
      {
        source: "/django-api/:path*",
        destination: `${origin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
