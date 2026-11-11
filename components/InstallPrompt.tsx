"use client";

import * as React from "react";
import { Download, Share, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RESTAURANT_CONFIG } from "@/lib/config";
import { useHydrated } from "@/lib/use-hydrated";

const DISMISS_STORAGE_KEY = "pwa_install_dismissed_at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  const displayModeStandalone = window.matchMedia(
    "(display-mode: standalone)"
  ).matches;
  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };
  return Boolean(displayModeStandalone || navigatorWithStandalone.standalone);
}

function isIosSafariBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIosDevice =
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1);
  if (!isIosDevice) return false;
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/i.test(ua);
  return !isOtherIosBrowser && /Safari/i.test(ua);
}

function wasRecentlyDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const hydrated = useHydrated();
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [installed, setInstalled] = React.useState(false);

  React.useEffect(() => {
    if (!hydrated) return;

    if (isStandaloneMode()) {
      setInstalled(true);
      return;
    }

    if (wasRecentlyDismissed()) {
      setDismissed(true);
      return;
    }

    if (isIosSafariBrowser()) {
      setShowIosHint(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShowIosHint(false);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setShowIosHint(false);
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
  }, [hydrated]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    } catch {
      // Ignore storage failures in private browsing
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      } else {
        handleDismiss();
      }
    } finally {
      setDeferredPrompt(null);
    }
  };

  if (!hydrated || installed || dismissed) {
    return null;
  }

  if (!deferredPrompt && !showIosHint) {
    return null;
  }

  return (
    <aside
      aria-label="Install app"
      className="border-b border-amber-500/20 bg-amber-50/90 px-4 py-2.5 text-sm text-amber-950 dark:bg-amber-950/35 dark:text-amber-100 print:hidden"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {deferredPrompt ? (
            <Download
              className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
          ) : (
            <Share
              className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
          )}
          <p className="text-xs leading-snug sm:text-sm">
            {deferredPrompt ? (
              <>
                Install{" "}
                <strong className="font-semibold">
                  {RESTAURANT_CONFIG.name}
                </strong>{" "}
                for faster ordering and one-tap access.
              </>
            ) : (
              <>
                Install app: Tap{" "}
                <strong className="font-semibold">Share</strong>, then{" "}
                <strong className="font-semibold">Add to Home Screen</strong>.
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {deferredPrompt && (
            <Button
              type="button"
              size="sm"
              onClick={handleInstallClick}
              className="min-h-8 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-zinc-950 dark:hover:bg-amber-400"
            >
              Install App
            </Button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install banner"
            className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg text-amber-900/80 transition-colors hover:bg-amber-500/15 hover:text-amber-950 focus-visible:outline-2 focus-visible:outline-ring dark:text-amber-200/80 dark:hover:text-amber-50"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}

