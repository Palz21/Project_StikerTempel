import { z } from "zod";
import {
  cupSpecsSchema,
  dtfBajuSpecsSchema,
  lainnyaSpecsSchema,
  plastikSpecsSchema,
} from "./specs";

export * from "./specs";

// ==========================================
// AUTH & USER SCHEMAS
// ==========================================

export const loginSchema = z.object({
  email: z.string().trim().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  email: z.string().trim().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter").max(100),
  role: z.enum(["OWNER", "ADMIN"]).default("ADMIN"),
});

export const toggleUserActiveSchema = z.object({
  userId: z.string().min(1, "ID pengguna wajib diisi"),
  isActive: z.boolean(),
});

// ==========================================
// SHOP SETTINGS SCHEMA
// ==========================================

export const shopSettingSchema = z.object({
  shopName: z.string().trim().min(2, "Nama workshop wajib diisi").max(120),
  whatsappNumber: z
    .string()
    .trim()
    .min(9, "Nomor WhatsApp tidak valid")
    .max(20),
  address: z.string().trim().min(5, "Alamat workshop wajib diisi").max(500),
  mapsUrl: z
    .string()
    .trim()
    .url("URL Google Maps tidak valid")
    .optional()
    .or(z.literal("")),
  bankInfo: z.string().trim().min(5, "Info rekening wajib diisi").max(500),
});

// ==========================================
// INVENTORY SCHEMAS
// ==========================================

export const rawMaterialSchema = z.object({
  name: z.string().trim().min(2, "Nama bahan baku wajib diisi").max(120),
  category: z.enum(["CUP", "PLASTIK", "DTF_BAJU", "LAINNYA"]),
  stockQty: z.coerce.number().int().min(0, "Stok tidak boleh negatif"),
  minStock: z.coerce.number().int().min(0, "Stok minimum tidak boleh negatif"),
  unit: z.string().trim().min(1, "Satuan wajib diisi").max(30),
});

export const updateRawMaterialSchema = rawMaterialSchema.extend({
  id: z.string().min(1, "ID bahan baku wajib diisi"),
});

export const restockMaterialSchema = z
  .object({
    rawMaterialId: z.string().min(1, "Bahan baku wajib dipilih"),
    addedQty: z.coerce.number().int().min(1, "Jumlah restock minimal 1"),
    recordExpense: z.boolean().default(false),
    expenseAmount: z.coerce.number().int().min(0).default(0),
    description: z.string().trim().max(300).optional(),
  })
  .refine(
    (data) => !data.recordExpense || data.expenseAmount > 0,
    {
      message: "Nominal biaya kulakan wajib lebih dari 0 jika dicatat ke kas",
      path: ["expenseAmount"],
    }
  );

// ==========================================
// FINANCE SCHEMAS
// ==========================================

export const createExpenseSchema = z.object({
  category: z.string().trim().min(2, "Kategori pengeluaran wajib diisi").max(80),
  amount: z.coerce.number().int().min(1, "Nominal pengeluaran minimal Rp1"),
  description: z.string().trim().max(500).optional(),
  date: z.coerce.date().optional(),
});

// ==========================================
// ORDER ITEM & ORDER SCHEMAS
// ==========================================

const orderItemBaseFields = {
  rawMaterialId: z.string().min(1).nullable().optional(),
  itemName: z.string().trim().min(2, "Nama item wajib diisi").max(150),
  qty: z.coerce.number().int().min(1, "Jumlah minimal 1"),
  unitPrice: z.coerce.number().int().min(0, "Harga satuan tidak boleh negatif").default(0),
  logoUrl: z.string().trim().nullable().optional(),
};

export const orderItemInputSchema = z.discriminatedUnion("category", [
  z.object({
    ...orderItemBaseFields,
    category: z.literal("CUP"),
    specs: cupSpecsSchema,
  }),
  z.object({
    ...orderItemBaseFields,
    category: z.literal("PLASTIK"),
    specs: plastikSpecsSchema,
  }),
  z.object({
    ...orderItemBaseFields,
    category: z.literal("DTF_BAJU"),
    specs: dtfBajuSpecsSchema,
  }),
  z.object({
    ...orderItemBaseFields,
    category: z.literal("LAINNYA"),
    specs: lainnyaSpecsSchema,
  }),
]);

export const createAdminOrderSchema = z.object({
  customerName: z.string().trim().min(2, "Nama pelanggan wajib diisi").max(120),
  customerWa: z.string().trim().min(9, "Nomor WhatsApp tidak valid").max(20),
  pickupMethod: z.enum(["SELF_PICKUP", "INSTANT_COURIER", "EXPEDITION"]).default("SELF_PICKUP"),
  initialStatus: z.enum(["WAITING_ACC_PAYMENT", "PRODUCTION_QUEUE"]).default("WAITING_ACC_PAYMENT"),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(orderItemInputSchema).min(1, "Minimal 1 item pesanan"),
  initialPaymentAmount: z.coerce.number().int().min(0).default(0),
  initialPaymentMethod: z.enum(["TRANSFER", "TUNAI", "QRIS"]).default("TRANSFER"),
  initialPaymentNote: z.string().trim().max(200).optional(),
});

export const createClientOrderSchema = z.object({
  customerName: z.string().trim().min(2, "Nama wajib diisi").max(120),
  customerWa: z.string().trim().min(9, "Nomor WhatsApp tidak valid").max(20),
  pickupMethod: z.enum(["SELF_PICKUP", "INSTANT_COURIER", "EXPEDITION"]).default("SELF_PICKUP"),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(orderItemInputSchema).min(1, "Minimal 1 item pesanan"),
});

export const confirmPendingOrderSchema = z.object({
  orderId: z.string().min(1),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        rawMaterialId: z.string().min(1).nullable().optional(),
        qty: z.coerce.number().int().min(1),
        unitPrice: z.coerce.number().int().min(1, "Harga satuan wajib diisi"),
      })
    )
    .min(1),
  notes: z.string().trim().max(1000).optional(),
});

export const updateOrderItemsSchema = z.object({
  orderId: z.string().min(1),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        qty: z.coerce.number().int().min(1),
        unitPrice: z.coerce.number().int().min(0),
      })
    )
    .min(1),
});

export const advanceOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  nextStatus: z.enum([
    "WAITING_ACC_PAYMENT",
    "PRODUCTION_QUEUE",
    "IN_PROGRESS",
    "READY_FOR_PICKUP",
    "COMPLETED",
  ]),
  trackingNumber: z.string().trim().max(100).optional(),
});

export const cancelOrderSchema = z.object({
  orderId: z.string().min(1),
  cancelReason: z.string().trim().min(3, "Alasan pembatalan wajib diisi").max(500),
  refundAmount: z.coerce.number().int().min(0, "Nominal refund tidak boleh negatif").default(0),
  restoreStock: z.boolean().default(false),
});

// ==========================================
// PAYMENT & REVISION SCHEMAS
// ==========================================

export const addPaymentSchema = z.object({
  orderId: z.string().min(1),
  amount: z.coerce.number().int().min(1, "Nominal pembayaran minimal Rp1"),
  paymentMethod: z.enum(["TRANSFER", "TUNAI", "QRIS"]).default("TRANSFER"),
  proofUrl: z.string().trim().nullable().optional(),
  note: z.string().trim().max(250).optional(),
});

export const uploadMockupSchema = z.object({
  orderId: z.string().min(1),
  mockupUrl: z.string().trim().min(1, "URL mockup wajib diisi"),
  adminNote: z.string().trim().max(500).optional(),
});

export const clientApproveDesignSchema = z.object({
  uuid: z.string().uuid("UUID tidak valid"),
});

export const clientRequestRevisionSchema = z.object({
  uuid: z.string().uuid("UUID tidak valid"),
  clientNote: z.string().trim().min(3, "Catatan revisi minimal 3 karakter").max(1000),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ShopSettingInput = z.infer<typeof shopSettingSchema>;
export type RawMaterialInput = z.infer<typeof rawMaterialSchema>;
export type RestockMaterialInput = z.infer<typeof restockMaterialSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type CreateAdminOrderInput = z.infer<typeof createAdminOrderSchema>;
export type CreateClientOrderInput = z.infer<typeof createClientOrderSchema>;
export type ConfirmPendingOrderInput = z.infer<typeof confirmPendingOrderSchema>;
export type UpdateOrderItemsInput = z.infer<typeof updateOrderItemsSchema>;
export type AdvanceOrderStatusInput = z.infer<typeof advanceOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type AddPaymentInput = z.infer<typeof addPaymentSchema>;
export type UploadMockupInput = z.infer<typeof uploadMockupSchema>;
