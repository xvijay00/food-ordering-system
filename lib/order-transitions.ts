import type { OrderType, StaffRole } from "@/types/database";

export type OrderTransitionAction = {
  targetStatus: string;
  label: string;
  variant?: "default" | "outline" | "destructive";
};

export const ORDER_STATUS_META: Record<
  string,
  { label: string; tone: string }
> = {
  placed: {
    label: "Placed",
    tone: "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-200",
  },
  confirmed: {
    label: "Confirmed",
    tone: "bg-sky-500/15 text-sky-800 border-sky-500/30 dark:text-sky-200",
  },
  preparing: {
    label: "Preparing",
    tone: "bg-violet-500/15 text-violet-800 border-violet-500/30 dark:text-violet-200",
  },
  ready: {
    label: "Ready",
    tone: "bg-emerald-500/15 text-emerald-800 border-emerald-500/30 dark:text-emerald-200",
  },
  out_for_delivery: {
    label: "Out for delivery",
    tone: "bg-cyan-500/15 text-cyan-800 border-cyan-500/30 dark:text-cyan-200",
  },
  served: {
    label: "Served",
    tone: "bg-emerald-600/15 text-emerald-900 border-emerald-600/30 dark:text-emerald-200",
  },
  delivered: {
    label: "Delivered",
    tone: "bg-emerald-600/15 text-emerald-900 border-emerald-600/30 dark:text-emerald-200",
  },
  completed: {
    label: "Completed",
    tone: "bg-emerald-600/15 text-emerald-900 border-emerald-600/30 dark:text-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    tone: "bg-rose-500/15 text-rose-800 border-rose-500/30 dark:text-rose-200",
  },
};

export function canRoleTransitionOrder(
  role: StaffRole,
  orderType: OrderType,
  currentStatus: string,
  targetStatus: string
): { allowed: boolean; reason?: string } {
  if (currentStatus === targetStatus) {
    return { allowed: false, reason: "Order is already in this status." };
  }

  const isTerminal =
    currentStatus === "completed" ||
    currentStatus === "served" ||
    currentStatus === "delivered" ||
    currentStatus === "cancelled";

  if (isTerminal) {
    return {
      allowed: false,
      reason: `Cannot update an order that is already ${currentStatus}.`,
    };
  }

  // Validate streamlined 2-step workflow (Confirm -> Deliver)
  const validTargetsByState: Record<string, string[]> = {
    placed: ["confirmed", "cancelled"],
    confirmed: ["delivered", "completed", "cancelled"],
    preparing: ["delivered", "completed", "cancelled"],
    ready: ["delivered", "completed", "cancelled"],
    out_for_delivery: ["delivered", "completed", "cancelled"],
  };

  const allowedTargets = validTargetsByState[currentStatus] ?? [];
  if (!allowedTargets.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Invalid transition from "${currentStatus}" to "${targetStatus}" for a ${orderType} order.`,
    };
  }

  // Enforce role permissions
  if (role === "admin") {
    return { allowed: true };
  }

  if (role === "kitchen") {
    const isKitchenMove =
      (currentStatus === "placed" && targetStatus === "confirmed") ||
      ((currentStatus === "confirmed" ||
        currentStatus === "preparing" ||
        currentStatus === "ready") &&
        (targetStatus === "delivered" || targetStatus === "completed"));

    if (!isKitchenMove) {
      return {
        allowed: false,
        reason:
          "Kitchen staff can only confirm new orders or mark confirmed orders delivered.",
      };
    }
    return { allowed: true };
  }

  if (role === "delivery") {
    if (orderType !== "delivery") {
      return {
        allowed: false,
        reason: "Delivery staff can only act on delivery orders.",
      };
    }

    const isDeliveryMove =
      (currentStatus === "confirmed" ||
        currentStatus === "preparing" ||
        currentStatus === "ready" ||
        currentStatus === "out_for_delivery") &&
      (targetStatus === "delivered" || targetStatus === "completed");

    if (!isDeliveryMove) {
      return {
        allowed: false,
        reason:
          "Delivery staff can only mark confirmed orders as delivered.",
      };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: "Unauthorized role." };
}

export function getAvailableOrderActions(
  role: StaffRole,
  orderType: OrderType,
  currentStatus: string
): OrderTransitionAction[] {
  const candidates: OrderTransitionAction[] = [];

  if (currentStatus === "placed") {
    candidates.push(
      { targetStatus: "confirmed", label: "Confirm order", variant: "default" },
      { targetStatus: "cancelled", label: "Reject", variant: "destructive" }
    );
  } else if (
    currentStatus === "confirmed" ||
    currentStatus === "accepted" ||
    currentStatus === "preparing" ||
    currentStatus === "ready" ||
    currentStatus === "out_for_delivery"
  ) {
    candidates.push({
      targetStatus: "delivered",
      label: "Mark delivered",
      variant: "default",
    });
  }

  return candidates.filter(
    (action) =>
      canRoleTransitionOrder(role, orderType, currentStatus, action.targetStatus)
        .allowed
  );
}

