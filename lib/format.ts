import { RESTAURANT_CONFIG } from "@/lib/config";

export function formatPrice(amount: number): string {
  const normalized = Number.isFinite(amount) ? amount : 0;
  const formatted = Number.isInteger(normalized)
    ? normalized.toString()
    : normalized.toFixed(2);
  return `${RESTAURANT_CONFIG.currencySymbol}${formatted}`;
}

