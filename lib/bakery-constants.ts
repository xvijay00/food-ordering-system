export const BAKERY_CATEGORY_PRESETS = [
  "Cakes",
  "Pastries",
  "Pizza",
  "Bread",
] as const;

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

