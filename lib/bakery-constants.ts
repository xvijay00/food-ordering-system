export const BAKERY_CATEGORY_PRESETS = [
  "Cakes",
  "Pastries",
  "Pizza",
  "Bread",
] as const;

export const BIRTHDAY_CATEGORY_PRESETS = [
  "Birthday Cakes",
  "Balloons",
  "Birthday Candles",
  "Birthday Caps",
  "Birthday Banners",
  "Party Decorations",
  "Cake Accessories",
  "Birthday Gift Items",
] as const;

export const BIRTHDAY_CATEGORY_NAMES = new Set(
  BIRTHDAY_CATEGORY_PRESETS.map((name) => name.toLowerCase())
);

export function isBirthdayCategory(name?: string | null): boolean {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  return (
    BIRTHDAY_CATEGORY_NAMES.has(lower) ||
    lower.includes("birthday") ||
    lower.includes("balloon") ||
    lower.includes("party decoration") ||
    lower.includes("candle") ||
    lower.includes("banner")
  );
}

export const BAKERY_FLAVOUR_PRESETS = [
  "Chocolate",
  "Vanilla",
  "Pineapple",
  "Butterscotch",
  "Red Velvet",
  "Strawberry",
] as const;

export const BAKERY_EGG_OPTIONS = ["Eggless", "With Egg"] as const;

export const CAKE_SIZE_PRESETS = [
  { label: "0.5kg", multiplier: 1 },
  { label: "1kg", multiplier: 1.8 },
  { label: "2kg", multiplier: 3.4 },
] as const;

export const BAKERY_ADDON_PRESETS = [
  { name: "Extra Chocolate Chips", price: 50 },
  { name: "Birthday Candles", price: 40 },
  { name: "Choco Truffle Drizzle", price: 70 },
  { name: "Fresh Fruit Topping", price: 80 },
] as const;

export function getEffectiveBasePrice(item: {
  price: number;
  discount_price?: number | null;
}): {
  sellingPrice: number;
  originalPrice: number;
  hasDiscount: boolean;
  discountPercent: number;
} {
  const originalPrice = Number(item.price);
  const discountRaw =
    item.discount_price !== null && item.discount_price !== undefined
      ? Number(item.discount_price)
      : null;

  const hasDiscount =
    discountRaw !== null &&
    Number.isFinite(discountRaw) &&
    discountRaw >= 0 &&
    discountRaw < originalPrice;

  const sellingPrice = hasDiscount ? discountRaw : originalPrice;
  const discountPercent =
    hasDiscount && originalPrice > 0
      ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
      : 0;

  return { sellingPrice, originalPrice, hasDiscount, discountPercent };
}

export function getProductImages(item: {
  image_url?: string | null;
  image_urls?: string[] | null;
}): string[] {
  const list = Array.isArray(item.image_urls)
    ? item.image_urls.filter((u): u is string => typeof u === "string" && u.length > 0)
    : [];
  if (list.length > 0) return list;
  if (item.image_url) return [item.image_url];
  return [];
}

export function isCustomCakeItem(
  itemOrName?:
    | {
        id?: string | null;
        name?: string | null;
        custom_image_url?: string | null;
        customImageUrl?: string | null;
      }
    | string
    | null
): boolean {
  if (!itemOrName) return false;
  if (typeof itemOrName === "string") {
    const l = itemOrName.toLowerCase();
    return (
      l.includes("custom") ||
      l.includes("photo birthday cake") ||
      l.includes("photo cake")
    );
  }
  if (itemOrName.custom_image_url || itemOrName.customImageUrl) return true;
  if (itemOrName.id === "7637c7c8-07e8-4955-9b0a-8fe1a074a750") return true;
  const l = (itemOrName.name || "").toLowerCase();
  return (
    l.includes("custom") ||
    l.includes("photo birthday cake") ||
    l.includes("photo cake")
  );
}

