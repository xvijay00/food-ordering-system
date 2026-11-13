"use client";

import * as React from "react";
import Image from "next/image";
import { Download, Share, Smartphone, X } from "lucide-react";

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

export function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [isIos, setIsIos] = React.useState(false);
  const [bannerVisible, setBannerVisible] = React.useState(false);
  const [iosModalOpen, setIosModalOpen] = React.useState(false);

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

    // 2. Detect if already installed / running in standalone mode
    if (typeof window !== "undefined") {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone ===
          true;
      setIsStandalone(isStandaloneMode);

      // Detect iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice =
        /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
      setIsIos(isIosDevice);

      // Check if user dismissed recently
      const dismissed = sessionStorage.getItem("pwa_prompt_dismissed");

      if (!isStandaloneMode) {
        if (!dismissed) {
          // Auto-show banner after 2 seconds for first-time visitors
          const timer = setTimeout(() => {
            setBannerVisible(true);
          }, 2000);
          return () => clearTimeout(timer);
        }
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
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setBannerVisible(false);
        setDeferredPrompt(null);
      }
      return;
    }

    if (isIos) {
      setIosModalOpen(true);
      return;
    }

    // If browser doesn't dispatch beforeinstallprompt (e.g. desktop Chrome already prompting or unsupported)
    alert(
      "To install this app, tap the install icon in your browser address bar or open your browser menu and choose 'Install Baker's Nation'."
    );
  };

  const handleDismiss = () => {
    setBannerVisible(false);
    sessionStorage.setItem("pwa_prompt_dismissed", "true");
  };

  if (isStandalone || !bannerVisible) {
    return (
      <IosInstructionsModal
        open={iosModalOpen}
        onOpenChange={setIosModalOpen}
      />
    );
  }

  return (
    <>
      {/* Floating PWA Download Banner */}
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

      <IosInstructionsModal
        open={iosModalOpen}
        onOpenChange={setIosModalOpen}
      />
    </>
  );
}

function IosInstructionsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
            <Smartphone className="size-7" aria-hidden="true" />
          </div>
          <DialogTitle className="text-center font-heading text-lg font-bold">
            Install {RESTAURANT_CONFIG.name} on iPhone / iPad
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            Follow these 3 quick steps in Safari to add the app to your Home Screen:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              1
            </span>
            <div>
              <p className="font-semibold text-foreground">
                Tap the Share button
              </p>
              <p className="mt-0.5 text-muted-foreground">
                At the bottom of your Safari screen, tap the Share icon{" "}
                <Share className="inline size-3.5" aria-hidden="true" />.
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
                Scroll down the share options and tap{" "}
                <span className="font-semibold">Add to Home Screen</span>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              3
            </span>
            <div>
              <p className="font-semibold text-foreground">
                Tap &ldquo;Add&rdquo;
              </p>
              <p className="mt-0.5 text-muted-foreground">
                Tap <span className="font-semibold">Add</span> in the top-right corner to finish.
              </p>
            </div>
          </div>
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

