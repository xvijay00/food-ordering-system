"use client";

import * as React from "react";
import Image from "next/image";
import { Download, Monitor, MoreVertical, Share, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RESTAURANT_CONFIG } from "@/lib/config";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

type DevicePlatform = "ios" | "android" | "desktop";

export function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [platform, setPlatform] = React.useState<DevicePlatform>("desktop");
  const [bannerVisible, setBannerVisible] = React.useState(false);
  const [guideModalOpen, setGuideModalOpen] = React.useState(false);

  React.useEffect(() => {
    // 1. Register Service Worker in production
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .catch((err) => {
            console.error("PWA Service Worker registration failed:", err);
          });
      });
    }

    // 2. Detect standalone mode & device platform
    if (typeof window !== "undefined") {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone ===
          true;
      setIsStandalone(isStandaloneMode);

      const ua = window.navigator.userAgent.toLowerCase();
      const isIosDevice =
        /iphone|ipad|ipod/.test(ua) &&
        !(window as unknown as { MSStream?: unknown }).MSStream;
      const isAndroidDevice = /android/.test(ua);

      if (isIosDevice) {
        setPlatform("ios");
      } else if (isAndroidDevice) {
        setPlatform("android");
      } else {
        setPlatform("desktop");
      }

      // Check if user dismissed recently
      const dismissed = sessionStorage.getItem("pwa_prompt_dismissed");

      if (!isStandaloneMode && !dismissed) {
        // Auto-show banner after 2 seconds for first-time visitors
        const timer = setTimeout(() => {
          setBannerVisible(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const dismissed = sessionStorage.getItem("pwa_prompt_dismissed");
      if (!dismissed) {
        setBannerVisible(true);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setBannerVisible(false);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    // If native prompt is ready (Android Chrome or supported browser)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setBannerVisible(false);
          setDeferredPrompt(null);
        }
        return;
      } catch (err) {
        console.warn("Native prompt failed, falling back to guide dialog:", err);
      }
    }

    // Open friendly visual install guide modal for their platform
    setGuideModalOpen(true);
  };

  const handleDismiss = () => {
    setBannerVisible(false);
    sessionStorage.setItem("pwa_prompt_dismissed", "true");
  };

  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* Floating PWA Download Banner */}
      {bannerVisible && (
        <aside
          aria-label="Install Baker's Nation App"
          className="fixed right-3 bottom-20 left-3 z-50 mx-auto max-w-lg rounded-2xl border border-amber-500/30 bg-card/95 p-3.5 shadow-xl backdrop-blur-md transition-all sm:right-6 sm:bottom-6 sm:left-auto sm:w-96 md:bottom-6"
        >
          <div className="flex items-start gap-3">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-amber-950 ring-1 ring-border shadow-xs">
              <Image
                src="/icons/icon-192.png"
                alt={`${RESTAURANT_CONFIG.name} app icon`}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-1">
                <div>
                  <h4 className="font-heading text-sm font-bold text-foreground">
                    Install {RESTAURANT_CONFIG.name}
                  </h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Download app for faster ordering &amp; live delivery alerts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDismiss}
                  aria-label="Dismiss install banner"
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleInstallClick()}
                  className="h-8 gap-1.5 rounded-lg px-3.5 text-xs font-semibold shadow-xs"
                >
                  <Download className="size-3.5" aria-hidden="true" />
                  <span>Install App</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-8 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Not now
                </Button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Elegant Visual Install Instructions Modal */}
      <InstallGuideModal
        open={guideModalOpen}
        onOpenChange={setGuideModalOpen}
        platform={platform}
      />
    </>
  );
}

function InstallGuideModal({
  open,
  onOpenChange,
  platform,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: DevicePlatform;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
            {platform === "desktop" ? (
              <Monitor className="size-7" aria-hidden="true" />
            ) : (
              <Smartphone className="size-7" aria-hidden="true" />
            )}
          </div>
          <DialogTitle className="text-center font-heading text-lg font-bold">
            How to Install {RESTAURANT_CONFIG.name}
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            {platform === "ios"
              ? "Follow these 3 quick steps in Safari on iPhone / iPad:"
              : platform === "android"
              ? "Follow these quick steps in Chrome on Android:"
              : "Install directly in your browser on PC / Mac:"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          {platform === "ios" && (
            <>
              <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  1
                </span>
                <div>
                  <p className="font-semibold text-foreground">
                    Tap the Share button
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    At the bottom of Safari, tap the Share icon{" "}
                    <Share className="inline size-3.5 text-primary" aria-hidden="true" />.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  2
                </span>
                <div>
                  <p className="font-semibold text-foreground">
                    Select &ldquo;Add to Home Screen&rdquo;
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    Scroll down in the options and tap{" "}
                    <span className="font-semibold text-foreground">Add to Home Screen</span>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  3
                </span>
                <div>
                  <p className="font-semibold text-foreground">Tap &ldquo;Add&rdquo;</p>
                  <p className="mt-0.5 text-muted-foreground">
                    Tap <span className="font-semibold text-foreground">Add</span> in the top-right corner to finish.
                  </p>
                </div>
              </div>
            </>
          )}

          {platform === "android" && (
            <>
              <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  1
                </span>
                <div>
                  <p className="font-semibold text-foreground">
                    Tap the browser menu
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    Tap the three dots{" "}
                    <MoreVertical className="inline size-3.5 text-primary" aria-hidden="true" /> in the top-right corner of Chrome.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  2
                </span>
                <div>
                  <p className="font-semibold text-foreground">
                    Choose &ldquo;Install app&rdquo;
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    Tap <span className="font-semibold text-foreground">Install app</span> (or &ldquo;Add to Home screen&rdquo;) and confirm.
                  </p>
                </div>
              </div>
            </>
          )}

          {platform === "desktop" && (
            <>
              <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  1
                </span>
                <div>
                  <p className="font-semibold text-foreground">
                    Address Bar Install Icon
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    Look at the right side of your browser address (URL) bar for the{" "}
                    <span className="font-semibold text-foreground">Install ⊕</span> icon and click it.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  2
                </span>
                <div>
                  <p className="font-semibold text-foreground">
                    Or Use Browser Menu
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    Click the three dots{" "}
                    <MoreVertical className="inline size-3.5 text-primary" aria-hidden="true" /> (menu) ➔ choose{" "}
                    <span className="font-semibold text-foreground">&ldquo;Install Baker&apos;s Nation&rdquo;</span>.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <Button
          type="button"
          onClick={() => onOpenChange(false)}
          className="min-h-10 w-full rounded-xl text-xs font-semibold"
        >
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  );
}
