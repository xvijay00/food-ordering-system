"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/use-hydrated";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, systemTheme, setTheme } = useTheme();
  const mounted = useHydrated();

  const handleToggle = () => {
    const targetTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(targetTheme === systemTheme ? "system" : targetTheme);
  };

  const label = !mounted
    ? "Toggle color theme"
    : resolvedTheme === "dark"
      ? "Switch to light theme"
      : "Switch to dark theme";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleToggle}
      aria-label={label}
      title={label}
      className={className}
    >
      <Sun
        aria-hidden="true"
        className="size-4 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90"
      />
      <Moon
        aria-hidden="true"
        className="absolute size-4 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0"
      />
      <span className="sr-only dark:hidden">Switch to dark theme</span>
      <span className="sr-only hidden dark:inline">Switch to light theme</span>
    </Button>
  );
}
