import { z } from "zod";

/** Numérico con coerción desde input de formulario (string) y límite de 4 decimales. */
const decimal = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} debe ser numérico` })
    .finite()
    .refine((n) => Math.abs(n * 1e4 - Math.round(n * 1e4)) < 1e-6, `${label}: máximo 4 decimales`);

export const createProductSchema = z.object({
  sku: z.string().trim().min(1, "SKU requerido").max(40).toUpperCase(),
  barcode: z
    .string()
    .trim()
    .max(48)
    .optional()
    .transform((v) => (v ? v : undefined)),
  name: z.string().trim().min(2, "Nombre requerido").max(160),
  unitOfMeasure: z.string().trim().min(1).max(10).default("UND"),
  minStock: decimal("Stock mínimo").pipe(z.number().min(0)).default(0),
  averageCost: decimal("Costo").pipe(z.number().min(0)).default(0),
  salePrice: decimal("Precio de venta").pipe(z.number().min(0)).default(0),
  categoryId: z.string().uuid("Categoría inválida"),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const MOVEMENT_TYPES = ["PURCHASE_RECEIPT", "SALE_DISPATCH", "ADJUSTMENT"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  PURCHASE_RECEIPT: "Entrada por compra",
  SALE_DISPATCH: "Salida por venta",
  ADJUSTMENT: "Ajuste",
};

/**
 * quantity siempre se ingresa en positivo; el signo lo determina el tipo
 * (y `direction` para ADJUSTMENT).
 */
export const stockMovementSchema = z
  .object({
    productId: z.string().uuid("Producto inválido"),
    warehouseId: z.string().uuid("Almacén inválido"),
    movementType: z.enum(MOVEMENT_TYPES),
    direction: z.enum(["IN", "OUT"]).optional(),
    quantity: decimal("Cantidad").pipe(z.number().positive("La cantidad debe ser mayor a 0")),
    unitCost: decimal("Costo unitario").pipe(z.number().min(0)).optional(),
    referenceNote: z
      .string()
      .trim()
      .max(240)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .superRefine((d, ctx) => {
    if (d.movementType === "PURCHASE_RECEIPT" && (d.unitCost === undefined || d.unitCost <= 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["unitCost"],
        message: "El costo unitario es obligatorio en entradas por compra",
      });
    }
    if (d.movementType === "ADJUSTMENT" && !d.direction) {
      ctx.addIssue({ code: "custom", path: ["direction"], message: "Indique entrada o salida" });
    }
  });
export type StockMovementInput = Omit<z.input<typeof stockMovementSchema>, "quantity" | "unitCost"> & {
  quantity: string | number;
  unitCost?: string | number;
};
