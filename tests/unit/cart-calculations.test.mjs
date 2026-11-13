import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateCartSubtotal,
  calculateCartItemCount,
  calculateCartTotal,
} from "../../store/cart.ts";

test("Cart Calculations - should correctly calculate subtotal for simple items", () => {
  const items = [
    {
      id: "1",
      menuItemId: "m1",
      name: "Sourdough Bread",
      unitPrice: 120,
      quantity: 2,
      addons: [],
    },
    {
      id: "2",
      menuItemId: "m2",
      name: "Chocolate Croissant",
      unitPrice: 95,
      quantity: 3,
      addons: [],
    },
  ];

  const subtotal = calculateCartSubtotal(items);
  assert.equal(subtotal, 120 * 2 + 95 * 3); // 240 + 285 = 525
  assert.equal(calculateCartItemCount(items), 5);
});

test("Cart Calculations - should calculate total with delivery fee", () => {
  const items = [
    {
      id: "1",
      menuItemId: "m1",
      name: "Truffle Cake",
      unitPrice: 650,
      quantity: 1,
      addons: [{ id: "a1", name: "Extra Cherries", price: 50 }],
    },
  ];

  const subtotal = calculateCartSubtotal(items);
  assert.equal(subtotal, 650);

  const total = calculateCartTotal(items, "delivery", 40);
  assert.equal(total, 690);
});

test("Cart Calculations - should return 0 for empty cart", () => {
  assert.equal(calculateCartSubtotal([]), 0);
  assert.equal(calculateCartItemCount([]), 0);
  assert.equal(calculateCartTotal([], "delivery", 40), 0);
});
