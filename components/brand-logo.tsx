import Image from "next/image";
import { cn } from "cn";

import { RESTAURANT_CONFIG } from "@/lib/config";

interface BrandLogoProps {
  className?: string;
  size?: number;
  priority?: boolean;
  decorative?: boolean;
}

/** High-resolution restaurant brand logo rendered from `/logo.png`. */
export function BrandLogo({
  className,
  size = 36,
  priority = false,
  decorative = false,
}: BrandLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt={decorative ? "" : `${RESTAURANT_CONFIG.name} logo`}
      aria-hidden={decorative || undefined}
      width={size}
      height={size}
      priority={priority}
      className={cn(
        "shrink-0 rounded-lg object-cover ring-1 ring-amber-500/30",
        className
      )}
    />
  );
}

