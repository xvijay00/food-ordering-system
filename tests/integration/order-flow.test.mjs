import test from "node:test";
import assert from "node:assert/strict";

import { placeOrderSchema } from "../../lib/validations.ts";

test("Order Flow Validation - rejects invalid Indian mobile number", () => {
  const result = placeOrderSchema.safeParse({
    orderType: "delivery",
    customerName: "Aarav Sharma",
    customerPhone: "1234567890", // Invalid: starts with 1
    deliveryAddress: "Flat 402, Sunshine Apartments, Sector 14, Gurgaon",
    paymentMethod: "cod",
    items: [
      {
        menuItemId: "11111111-1111-1111-1111-111111111111",
        quantity: 1,
      },
    ],
  });

  assert.equal(result.success, false);
  const phoneIssue = result.error.issues.find((i) => i.path.includes("customerPhone"));
  assert.ok(phoneIssue);
  assert.match(phoneIssue.message, /valid 10-digit Indian mobile number/i);
});

test("Order Flow Validation - rejects short delivery address", () => {
  const result = placeOrderSchema.safeParse({
    orderType: "delivery",
    customerName: "Aarav Sharma",
    customerPhone: "9876543210",
    deliveryAddress: "Home", // Invalid: < 10 chars
    paymentMethod: "cod",
    items: [
      {
        menuItemId: "11111111-1111-1111-1111-111111111111",
        quantity: 1,
      },
    ],
  });

  assert.equal(result.success, false);
  const addrIssue = result.error.issues.find((i) => i.path.includes("deliveryAddress"));
  assert.ok(addrIssue);
  assert.match(addrIssue.message, /at least 10 characters/i);
});

test("Order Flow Validation - accepts valid order with idempotencyKey", () => {
  const result = placeOrderSchema.safeParse({
    orderType: "delivery",
    customerName: "Aarav Sharma",
    customerPhone: "9876543210",
    deliveryAddress: "Flat 402, Sunshine Apartments, Sector 14, Gurgaon",
    paymentMethod: "cod",
    idempotencyKey: "e4eaaaf2-d142-41e1-a3e4-080027620cdd",
    items: [
      {
        menuItemId: "11111111-1111-4111-a111-111111111111",
        quantity: 2,
        selectedFlavour: "Vanilla",
        eggPreference: "Eggless",
        cakeMessage: "Happy Birthday!",
      },
    ],
  });

  assert.equal(result.success, true);
  assert.equal(result.data.customerPhone, "9876543210");
  assert.equal(result.data.idempotencyKey, "e4eaaaf2-d142-41e1-a3e4-080027620cdd");
});
