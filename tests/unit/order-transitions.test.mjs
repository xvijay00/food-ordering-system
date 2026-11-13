import test from "node:test";
import assert from "node:assert/strict";

import { canRoleTransitionOrder } from "../../lib/order-transitions.ts";

test("Order Transitions - admin can transition placed to confirmed and confirmed to delivered", () => {
  const t1 = canRoleTransitionOrder("admin", "delivery", "placed", "confirmed");
  assert.equal(t1.allowed, true);

  const t2 = canRoleTransitionOrder("admin", "delivery", "confirmed", "delivered");
  assert.equal(t2.allowed, true);
});

test("Order Transitions - admin can cancel placed and confirmed orders", () => {
  const t1 = canRoleTransitionOrder("admin", "delivery", "placed", "cancelled");
  assert.equal(t1.allowed, true);

  const t2 = canRoleTransitionOrder("admin", "delivery", "confirmed", "cancelled");
  assert.equal(t2.allowed, true);
});

test("Order Transitions - cannot transition terminal status", () => {
  const t1 = canRoleTransitionOrder("admin", "delivery", "delivered", "confirmed");
  assert.equal(t1.allowed, false);
  assert.match(t1.reason, /already delivered/i);

  const t2 = canRoleTransitionOrder("admin", "delivery", "cancelled", "confirmed");
  assert.equal(t2.allowed, false);
  assert.match(t2.reason, /already cancelled/i);
});

test("Order Transitions - delivery staff cannot cancel or confirm orders", () => {
  const t1 = canRoleTransitionOrder("delivery", "delivery", "placed", "confirmed");
  assert.equal(t1.allowed, false);

  const t2 = canRoleTransitionOrder("delivery", "delivery", "confirmed", "cancelled");
  assert.equal(t2.allowed, false);

  const t3 = canRoleTransitionOrder("delivery", "delivery", "confirmed", "delivered");
  assert.equal(t3.allowed, true);
});
