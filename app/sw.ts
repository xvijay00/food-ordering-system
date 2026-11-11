/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const isSupabaseRequest = (url: URL): boolean =>
  url.hostname.endsWith(".supabase.co") ||
  url.hostname.endsWith(".supabase.in") ||
  url.pathname.startsWith("/rest/v1/") ||
  url.pathname.startsWith("/auth/v1/") ||
  url.pathname.startsWith("/realtime/v1/");

const customRuntimeCaching: RuntimeCaching[] = [
  // Never cache API endpoints, admin routes, or Supabase requests
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin && url.pathname.startsWith("/api/"),
    method: "GET",
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin && url.pathname.startsWith("/api/"),
    method: "POST",
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin && url.pathname.startsWith("/api/"),
    method: "PATCH",
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin && url.pathname.startsWith("/api/"),
    method: "DELETE",
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ sameOrigin, url }) =>
      sameOrigin &&
      (url.pathname === "/admin" || url.pathname.startsWith("/admin/")),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url }) => isSupabaseRequest(url),
    method: "GET",
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url }) => isSupabaseRequest(url),
    method: "POST",
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url }) => isSupabaseRequest(url),
    method: "PATCH",
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url }) => isSupabaseRequest(url),
    method: "DELETE",
    handler: new NetworkOnly(),
  },
  // Cache images with StaleWhileRevalidate
  {
    matcher: ({ request, url }) =>
      !isSupabaseRequest(url) &&
      (request.destination === "image" ||
        /\.(?:jpg|jpeg|gif|png|svg|ico|webp|avif)$/i.test(url.pathname)),
    handler: new StaleWhileRevalidate({
      cacheName: "restaurant-image-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  // Cache JS/CSS/font static assets with StaleWhileRevalidate
  {
    matcher: ({ request, url }) =>
      request.destination === "style" ||
      request.destination === "script" ||
      request.destination === "font" ||
      /\.(?:js|css|woff2?|ttf|otf|eot)$/i.test(url.pathname),
    handler: new StaleWhileRevalidate({
      cacheName: "restaurant-static-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 7 * 24 * 60 * 60,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: customRuntimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

