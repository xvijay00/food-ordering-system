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

/* ============================================================
 * WEB PUSH NOTIFICATIONS FOR LOCK SCREEN ORDER ALERTS
 * Plays 3-second vibration and sounds notification ringtone,
 * waking the phone lock screen even when app is closed.
 * ============================================================ */

self.addEventListener("push", (event: PushEvent) => {
  let data: { title?: string; body?: string; url?: string } = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = {
        title: "🔔 New Order - Baker's Nation",
        body: event.data.text(),
        url: "/admin/orders?alert=1",
      };
    }
  }

  const title = data.title || "🔔 New Order Received - Baker's Nation";
  const body = data.body || "Tap to view full order details.";
  const url = data.url || "/admin/orders?alert=1";

  const options = {
    body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    // 3 seconds total penetrating vibration pattern [vibrate, pause, vibrate, pause, vibrate]
    vibrate: [500, 250, 500, 250, 1000],
    tag: "bakers-order-alert",
    renotify: true,
    requireInteraction: true,
    data: {
      url,
      timestamp: Date.now(),
    },
  } as unknown as NotificationOptions;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/admin/orders?alert=1";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // 1. If an admin orders window is already open, focus it and trigger the doorbell
      for (const client of clientList) {
        if ("focus" in client && client.url.includes("/admin/orders")) {
          client.postMessage({ type: "PLAY_ORDER_BELL" });
          return client.focus();
        }
      }

      // 2. Otherwise open a fresh window with ?alert=1 to ring the doorbell on load
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

