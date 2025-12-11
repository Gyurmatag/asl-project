import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Configure webpack to use our stub for @mediapipe/hands
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@mediapipe/hands": path.resolve("./stubs/@mediapipe/hands.js"),
      };
    }
    return config;
  },
};

export default nextConfig;
