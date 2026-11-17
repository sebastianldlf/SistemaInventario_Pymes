// Copiado de la web. No editar a mano sin revisar el origen.
// Tipos: backend/src/app/actions/inventory.ts
// Constantes y StockMovementInput: backend/src/lib/zod-schemas.ts

export type StockStatus = "NORMAL" | "REORDER";

export interface InventoryRow {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  unitOfMeasure: string;
  categoryId: string;
  categoryName: string;
  minStock: number;
  averageCost: number;
  salePrice: number;
  totalStock: number;
  stockByWarehouse: Record<string, number>; // warehouseId → qty
  status: StockStatus;
}

export interface InventoryOverview {
  rows: InventoryRow[];
  categories: { id: string; name: string }[];
  warehouses: { id: string; code: string; name: string }[];
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export const MOVEMENT_TYPES = ["PURCHASE_RECEIPT", "SALE_DISPATCH", "ADJUSTMENT"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  PURCHASE_RECEIPT: "Entrada por compra",
  SALE_DISPATCH: "Salida por venta",
  ADJUSTMENT: "Ajuste",
};

/** Cuerpo de POST /api/movements (equivale a StockMovementInput de la web). */
export interface StockMovementInput {
  productId: string;
  warehouseId: string;
  movementType: MovementType;
  direction?: "IN" | "OUT";
  quantity: string | number;
  unitCost?: string | number;
  referenceNote?: string;
}

export type MovementResult = ActionResult<{ kardexId: string; balanceQuantity: number; averageCost: number }>;
