import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Geçici olarak build sırasında ESLint'i devre dışı bırak
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;
