import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import withSerwistInit from "@serwist/next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const offlineRevision = crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  manifestTransforms: [
    async (manifestEntries) => {
      const hasOffline = manifestEntries.some((entry) => entry.url === "/offline");
      if (!hasOffline) {
        manifestEntries.push({
          url: "/offline",
          revision: offlineRevision,
          size: 0,
        });
      }
      return { manifest: manifestEntries, warnings: [] };
    },
  ],
});

/** @type {import("next").NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
      },
    ],
  },
};

export default withSerwist(nextConfig);
