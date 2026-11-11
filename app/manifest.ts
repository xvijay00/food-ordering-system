import type { MetadataRoute } from "next";

import { RESTAURANT_CONFIG } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: RESTAURANT_CONFIG.name,
    short_name: RESTAURANT_CONFIG.name,
    description: RESTAURANT_CONFIG.tagline,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#f59e0b",
    categories: ["food", "restaurant"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

