import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};


export default nextConfig;