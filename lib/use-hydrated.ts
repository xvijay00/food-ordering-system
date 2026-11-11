"use client";

import * as React from "react";

const emptySubscribe = () => () => {};

/**
 * Returns `true` on the client after hydration and `false` during SSR/initial hydration
 * to keep persisted client state (e.g. localStorage cart/theme) hydration-safe.
 */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

