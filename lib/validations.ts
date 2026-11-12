import { z } from "zod";

const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

const orderBaseFields = {
  orderType: z.literal("delivery", {
    error: "Only delivery orders are currently supported.",
  }),
  tableNo: z.null().optional(),
  customerName: z
    .string()
    .trim()
    .max(100, "Name must be 100 characters or fewer.")
    .optional()
    .or(z.literal("")),
  customerPhone: z
    .string()
    .trim()
    .max(20, "Phone number is too long.")
    .optional()
    .or(z.literal("")),
  deliveryAddress: z
    .string()
    .trim()
    .max(300, "Delivery address must be 300 characters or fewer.")
    .optional()
    .or(z.literal("")),
  paymentMethod: z.literal("cod"),
  notes: z
    .string()
    .trim()
    .max(300, "Notes must be 300 characters or fewer.")
    .optional()
    .or(z.literal("")),
  preorderAt: z
    .string()
    .trim()
    .max(64)
    .nullable()
    .optional()
    .or(z.literal("")),
};

function validateOrderDetails(
  data: {
    orderType: "delivery";
    tableNo?: null;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    paymentMethod: "cod";
    preorderAt?: string | null;
  },
  ctx: z.RefinementCtx
) {
  const trimmedName = data.customerName?.trim() ?? "";
  if (trimmedName.length < 2) {
    ctx.addIssue({
      code: "custom",
      path: ["customerName"],
      message: "Full name is required (at least 2 characters).",
    });
  }

  const trimmedPhone = data.customerPhone?.trim() ?? "";
  if (!INDIAN_PHONE_REGEX.test(trimmedPhone)) {
    ctx.addIssue({
      code: "custom",
      path: ["customerPhone"],
      message: "Enter a valid 10-digit Indian mobile number (starts with 6-9).",
    });
  }

  const trimmedAddress = data.deliveryAddress?.trim() ?? "";
  if (trimmedAddress.length < 10) {
    ctx.addIssue({
      code: "custom",
      path: ["deliveryAddress"],
      message: "Please enter your full delivery address (at least 10 characters).",
    });
  }

  const trimmedPreorder = data.preorderAt?.trim() ?? "";
  if (trimmedPreorder.length > 0) {
    const parsedDate = new Date(trimmedPreorder);
    if (Number.isNaN(parsedDate.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["preorderAt"],
        message: "Please choose a valid pre-order date and time.",
      });
    } else if (parsedDate.getTime() < Date.now() + 15 * 60 * 1000) {
      ctx.addIssue({
        code: "custom",
        path: ["preorderAt"],
        message: "Pre-order time must be at least 15 minutes from now.",
      });
    }
  }
}

export const checkoutFormSchema = z
  .strictObject(orderBaseFields)
  .superRefine(validateOrderDetails);

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export const orderItemInputSchema = z.strictObject({
  menuItemId: z.string().uuid("Invalid menu item ID."),
  variantId: z.string().uuid("Invalid variant ID.").nullable().optional(),
  addonIds: z.array(z.string().uuid("Invalid add-on ID.")).optional(),
  selectedFlavour: z.string().trim().max(40).nullable().optional(),
  eggPreference: z.string().trim().max(30).nullable().optional(),
  cakeMessage: z.string().trim().max(120).nullable().optional(),
  customImageUrl: z.string().trim().url().nullable().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1.").max(50),
});

export const placeOrderSchema = z
  .strictObject({
    ...orderBaseFields,
    items: z
      .array(orderItemInputSchema)
      .min(1, "Your cart must contain at least one item."),
  })
  .superRefine(validateOrderDetails);

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
