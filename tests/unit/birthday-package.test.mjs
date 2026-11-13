import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateBirthdayPackageItemCount,
  calculateBirthdayPackageSubtotal,
} from "../../store/cart.ts";
import {
  isBirthdayCategory,
  getEffectiveBasePrice,
} from "../../lib/bakery-constants.ts";

test("Birthday Package Subtotal - single item calculation", () => {
  const items = [
    {
      unitPrice: 800,
      quantity: 1,
    },
  ];

  const subtotal = calculateBirthdayPackageSubtotal(items);
  assert.equal(subtotal, 800);
  assert.equal(calculateBirthdayPackageItemCount(items), 1);
});

test("Birthday Package Subtotal - matches exact user prompt example", () => {
  // Birthday Cake: ₹800 × 1 = ₹800
  // Balloons: ₹100 × 2 = ₹200
  // Candles: ₹50 × 1 = ₹50
  // Birthday Banner: ₹150 × 1 = ₹150
  // Total: ₹1,200
  const items = [
    { unitPrice: 800, quantity: 1 },
    { unitPrice: 100, quantity: 2 },
    { unitPrice: 50, quantity: 1 },
    { unitPrice: 150, quantity: 1 },
  ];

  const subtotal = calculateBirthdayPackageSubtotal(items);
  const count = calculateBirthdayPackageItemCount(items);

  assert.equal(subtotal, 1200);
  assert.equal(count, 5);
});

test("Birthday Package Subtotal - handles empty package safely", () => {
  assert.equal(calculateBirthdayPackageSubtotal([]), 0);
  assert.equal(calculateBirthdayPackageItemCount([]), 0);
});

test("Birthday Package Subtotal - handles quantity adjustment", () => {
  const items = [
    { unitPrice: 150, quantity: 3 }, // 450
    { unitPrice: 49, quantity: 5 },  // 245
  ];

  assert.equal(calculateBirthdayPackageSubtotal(items), 695);
  assert.equal(calculateBirthdayPackageItemCount(items), 8);
});

test("Birthday Category Detection - accurately identifies official birthday categories", () => {
  assert.equal(isBirthdayCategory("Birthday Cakes"), true);
  assert.equal(isBirthdayCategory("Balloons"), true);
  assert.equal(isBirthdayCategory("Birthday Candles"), true);
  assert.equal(isBirthdayCategory("Birthday Caps"), true);
  assert.equal(isBirthdayCategory("Birthday Banners"), true);
  assert.equal(isBirthdayCategory("Party Decorations"), true);
  assert.equal(isBirthdayCategory("Cake Accessories"), true);
  assert.equal(isBirthdayCategory("Birthday Gift Items"), true);

  // Non-birthday bakery categories
  assert.equal(isBirthdayCategory("Bread"), false);
  assert.equal(isBirthdayCategory("Pizza"), false);
  assert.equal(isBirthdayCategory("Pastries"), false);
  assert.equal(isBirthdayCategory(null), false);
  assert.equal(isBirthdayCategory(undefined), false);
});

test("Pricing Management - computes selling price with discount accurately", () => {
  const itemWithDiscount = {
    price: 800,
    discount_price: 749,
  };
  const discounted = getEffectiveBasePrice(itemWithDiscount);
  assert.equal(discounted.sellingPrice, 749);
  assert.equal(discounted.originalPrice, 800);
  assert.equal(discounted.hasDiscount, true);
  assert.equal(discounted.discountPercent, 6); // round((800-749)/800 * 100) = 6%

  const regularItem = {
    price: 150,
    discount_price: null,
  };
  const regular = getEffectiveBasePrice(regularItem);
  assert.equal(regular.sellingPrice, 150);
  assert.equal(regular.originalPrice, 150);
  assert.equal(regular.hasDiscount, false);
});
