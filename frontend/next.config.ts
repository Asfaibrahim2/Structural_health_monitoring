import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow both localhost and 127.0.0.1 in Next.js 16 dev (avoids blocked chunks)
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
