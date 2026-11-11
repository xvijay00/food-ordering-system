import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { OrderItemAddon, OrderType } from "@/types/database";

export type CartItem = {
  id: string;
  menuItemId: string;
  name: string;
  imageUrl?: string | null;
  isVeg?: boolean;
  variantId?: string | null;
  variantLabel?: string | null;
  addons: OrderItemAddon[];
  unitPrice: number;
  quantity: number;
};

export type AddCartItemInput = {
  id?: string;
  menuItemId: string;
  name: string;
  imageUrl?: string | null;
  isVeg?: boolean;
  variantId?: string | null;
  variantLabel?: string | null;
  addons?: OrderItemAddon[];
  unitPrice: number;
  quantity?: number;
};

export type CartState = {
  orderType: OrderType | null;
  tableNo: number | null;
  notes: string;
  items: CartItem[];
  setOrderType: (orderType: OrderType | null) => void;
  setTableNo: (tableNo: number | null) => void;
  setDineInTable: (tableNo: number) => void;
  setNotes: (notes: string) => void;
  add: (item: AddCartItemInput) => void;
  remove: (id: string) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  clear: () => void;
  reset: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  getTotal: (deliveryFee?: number) => number;
};

export function buildCartItemId(
  menuItemId: string,
  variantKey?: string | null,
  addons: OrderItemAddon[] = []
): string {
  const addonKey = [...addons]
    .map((addon) => addon.id ?? addon.name)
    .sort()
    .join(",");
  return `${menuItemId}::${variantKey ?? ""}::${addonKey}`;
}

export function calculateCartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function calculateCartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function calculateCartTotal(
  items: CartItem[],
  orderType: OrderType | null,
  deliveryFee = 0
): number {
  const subtotal = calculateCartSubtotal(items);
  if (subtotal === 0) return 0;
  const appliedFee = orderType === "delivery" ? deliveryFee : 0;
  return subtotal + appliedFee;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      orderType: null,
      tableNo: null,
      notes: "",
      items: [],

      setOrderType: (orderType) =>
        set((state) => ({
          orderType,
          tableNo: orderType === "dine_in" ? state.tableNo : null,
        })),

      setTableNo: (tableNo) => set({ tableNo }),

      setDineInTable: (tableNo) =>
        set({
          orderType: "dine_in",
          tableNo,
        }),

      setNotes: (notes) => set({ notes }),

      add: (input) =>
        set((state) => {
          const addons = input.addons ?? [];
          const quantityToAdd = Math.max(1, input.quantity ?? 1);
          const id =
            input.id ??
            buildCartItemId(
              input.menuItemId,
              input.variantId ?? input.variantLabel,
              addons
            );

          const existing = state.items.find((item) => item.id === id);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.id === id
                  ? { ...item, quantity: item.quantity + quantityToAdd }
                  : item
              ),
            };
          }

          const newItem: CartItem = {
            id,
            menuItemId: input.menuItemId,
            name: input.name,
            imageUrl: input.imageUrl ?? null,
            isVeg: input.isVeg,
            variantId: input.variantId ?? null,
            variantLabel: input.variantLabel ?? null,
            addons,
            unitPrice: input.unitPrice,
            quantity: quantityToAdd,
          };

          return { items: [...state.items, newItem] };
        }),

      remove: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      increment: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        })),

      decrement: (id) =>
        set((state) => ({
          items: state.items.flatMap((item) => {
            if (item.id !== id) return [item];
            if (item.quantity <= 1) return [];
            return [{ ...item, quantity: item.quantity - 1 }];
          }),
        })),

      clear: () => set({ items: [], notes: "" }),

      reset: () => set({ orderType: null, tableNo: null, notes: "", items: [] }),

      getItemCount: () => calculateCartItemCount(get().items),

      getSubtotal: () => calculateCartSubtotal(get().items),

      getTotal: (deliveryFee = 0) =>
        calculateCartTotal(get().items, get().orderType, deliveryFee),
    }),
    {
      name: "food-ordering-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        orderType: state.orderType,
        tableNo: state.tableNo,
        notes: state.notes,
        items: state.items,
      }),
    }
  )
);
