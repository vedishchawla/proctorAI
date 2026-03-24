import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Required for face-api.js and TensorFlow.js compatibility
    webpack: (config) => {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            encoding: false,
            "node:fs": false,
            "node:path": false,
        };
        return config;
    },
    // Mongoose is server-side only
    serverExternalPackages: ["mongoose"],
    // Allow Firebase and face-api.js model assets
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com", // Google profile photos
            },
        ],
    },
};

export default nextConfig;
