"use server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createProductSchema,
  stockMovementSchema,
  type CreateProductInput,
  type StockMovementInput,
} from "@/lib/zod-schemas";

/* ------------------------------------------------------------------ */
/* Tipos serializables (Decimal → number para cruzar la frontera RSC) */
/* ------------------------------------------------------------------ */

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

const D = Prisma.Decimal;
const ZERO = new D(0);

/* ------------------------------------------------------------------ */
/* Consulta                                                            */
/* ------------------------------------------------------------------ */

export async function getInventoryOverview(): Promise<InventoryOverview> {
  const [products, categories, warehouses] = await Promise.all([
    prisma.product.findMany({
      orderBy: { sku: "asc" },
      include: { category: true, stocks: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ orderBy: { code: "asc" } }),
  ]);

  const rows: InventoryRow[] = products.map((p) => {
    const stockByWarehouse: Record<string, number> = {};
    let total = ZERO;
    for (const s of p.stocks) {
      stockByWarehouse[s.warehouseId] = s.currentQuantity.toNumber();
      total = total.plus(s.currentQuantity);
    }
    return {
      id: p.id,
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      unitOfMeasure: p.unitOfMeasure,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      minStock: p.minStock.toNumber(),
      averageCost: p.averageCost.toNumber(),
      salePrice: p.salePrice.toNumber(),
      totalStock: total.toNumber(),
      stockByWarehouse,
      status: total.lte(p.minStock) ? "REORDER" : "NORMAL",
    };
  });

  return {
    rows,
    categories,
    warehouses: warehouses.map(({ id, code, name }) => ({ id, code, name })),
  };
}

/* ------------------------------------------------------------------ */
/* Crear producto                                                      */
/* ------------------------------------------------------------------ */

export async function createProduct(
  input: z_Input<CreateProductInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    const p = await prisma.product.create({ data: parsed.data });
    revalidatePath("/inventario");
    return { ok: true, data: { id: p.id } };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "SKU o código de barras ya existe" };
    }
    throw e;
  }
}
type z_Input<T> = Partial<Record<keyof T, unknown>>;

/* ------------------------------------------------------------------ */
/* Movimiento de stock + Kardex (transacción atómica)                  */
/* ------------------------------------------------------------------ */

class BusinessError extends Error { }

/**
 * Convención de saldos:
 *  - `WarehouseStock.currentQuantity`: existencias por almacén.
 *  - `Product.averageCost`: Costo Promedio Ponderado (CPP) global del producto.
 *  - Kardex: `balanceQuantity` = saldo del almacén afectado tras el movimiento;
 *    `balanceUnitCost` = CPP vigente; `balanceTotalCost` = balanceQuantity × CPP.
 *  - Entradas recalculan CPP: (stockTotal·CPP + qty·costo) / (stockTotal + qty).
 *  - Salidas valorizan al CPP vigente y no lo alteran.
 *  - El producto se bloquea con SELECT … FOR UPDATE para serializar movimientos concurrentes.
 */
export async function registerStockMovement(
  input: StockMovementInput,
): Promise<ActionResult<{ kardexId: string; balanceQuantity: number; averageCost: number }>> {
  const parsed = stockMovementSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  const isInbound =
    d.movementType === "PURCHASE_RECEIPT" || (d.movementType === "ADJUSTMENT" && d.direction === "IN");
  const qty = new D(d.quantity);
  const signedQty = isInbound ? qty : qty.negated();

  try {
    const entry = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${d.productId} FOR UPDATE`;

        const [product, warehouse, stocks] = await Promise.all([
          tx.product.findUnique({ where: { id: d.productId } }),
          tx.warehouse.findUnique({ where: { id: d.warehouseId } }),
          tx.warehouseStock.findMany({ where: { productId: d.productId } }),
        ]);
        if (!product) throw new BusinessError("Producto no encontrado");
        if (!warehouse) throw new BusinessError("Almacén no encontrado");

        const totalBefore = stocks.reduce((acc, s) => acc.plus(s.currentQuantity), ZERO);
        const whBefore = stocks.find((s) => s.warehouseId === d.warehouseId)?.currentQuantity ?? ZERO;
        const whAfter = whBefore.plus(signedQty);

        if (whAfter.isNegative()) {
          throw new BusinessError(
            `Stock insuficiente en ${warehouse.code}: disponible ${whBefore.toString()}, solicitado ${qty.toString()}`,
          );
        }

        const currentAvg = product.averageCost;
        // Costo del movimiento: entradas usan el costo informado; salidas, el CPP vigente.
        const unitCost = isInbound ? new D(d.unitCost ?? currentAvg) : currentAvg;

        let newAvg = currentAvg;
        if (isInbound) {
          const totalAfter = totalBefore.plus(qty);
          newAvg = totalBefore.lte(0)
            ? unitCost
            : totalBefore.mul(currentAvg).plus(qty.mul(unitCost)).div(totalAfter);
          newAvg = newAvg.toDecimalPlaces(4);
        }

        await tx.warehouseStock.upsert({
          where: { productId_warehouseId: { productId: d.productId, warehouseId: d.warehouseId } },
          create: { productId: d.productId, warehouseId: d.warehouseId, currentQuantity: whAfter },
          update: { currentQuantity: whAfter },
        });

        if (!newAvg.equals(currentAvg)) {
          await tx.product.update({ where: { id: d.productId }, data: { averageCost: newAvg } });
        }

        return tx.kardexEntry.create({
          data: {
            productId: d.productId,
            warehouseId: d.warehouseId,
            movementType: d.movementType,
            quantity: signedQty,
            unitCost: unitCost.toDecimalPlaces(4),
            totalCost: signedQty.mul(unitCost).toDecimalPlaces(4),
            balanceQuantity: whAfter,
            balanceUnitCost: newAvg,
            balanceTotalCost: whAfter.mul(newAvg).toDecimalPlaces(4),
            referenceNote: d.referenceNote,
          },
        });
      },
      { maxWait: 5_000, timeout: 15_000 },
    );

    revalidatePath("/inventario");
    return {
      ok: true,
      data: {
        kardexId: entry.id,
        balanceQuantity: entry.balanceQuantity.toNumber(),
        averageCost: entry.balanceUnitCost.toNumber(),
      },
    };
  } catch (e) {
    if (e instanceof BusinessError) return { ok: false, error: e.message };
    console.error("[registerStockMovement]", e);
    return { ok: false, error: "Error interno al registrar el movimiento" };
  }
}
