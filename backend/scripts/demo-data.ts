/**
 * Datos de ejemplo: registra entradas por compra para que el inventario tenga stock.
 *
 * Usa registerStockMovement a través de POST /api/movements (el servidor Next debe estar corriendo),
 * porque la acción llama a revalidatePath, que solo funciona dentro del runtime de Next.
 *
 * Uso:  npx tsx scripts/demo-data.ts        (DEMO_API_URL por defecto: http://127.0.0.1:3002)
 *
 * Se niega a correr si DATABASE_URL apunta al proyecto Supabase antiguo o si ya hay filas en el Kardex.
 */
import { PrismaClient } from "@prisma/client";

const OLD_REF = "vdwvikammbvrnrdenwlw";
const API = process.env.DEMO_API_URL ?? "http://127.0.0.1:3002";

const MOVEMENTS = [
  { sku: "ELE-0001", wh: "ALM-01", quantity: "950", unitCost: "98.50", note: "Demo · stock inicial" },
  { sku: "FER-0001", wh: "ALM-01", quantity: "40", unitCost: "18.90", note: "Demo · stock inicial" },
  { sku: "FER-0001", wh: "ALM-02", quantity: "6", unitCost: "18.90", note: "Demo · stock inicial" },
  { sku: "ELE-0002", wh: "ALM-02", quantity: "12", unitCost: "3.80", note: "Demo · stock inicial" },
  // FER-0002 y LIM-0001 quedan sin stock (Agotado).
];

function projectRef(url: string): string {
  const u = new URL(url);
  return decodeURIComponent(u.username).split(".")[1] ?? u.hostname.match(/^db\.([a-z0-9]+)\./)?.[1] ?? "?";
}

async function main() {
  if (!process.env.DATABASE_URL) process.loadEnvFile(".env");
  const ref = projectRef(process.env.DATABASE_URL ?? "");
  console.log(`Project ref: ${ref}`);
  if (ref === OLD_REF) throw new Error("DATABASE_URL apunta al proyecto antiguo. Abortado.");

  const prisma = new PrismaClient();
  try {
    const kardex = await prisma.kardexEntry.count();
    if (kardex > 0) throw new Error(`La base ya tiene ${kardex} movimientos en el Kardex. Abortado para no duplicar.`);
  } finally {
    await prisma.$disconnect();
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.API_KEY) headers["x-api-key"] = process.env.API_KEY;

  const inv = await fetch(`${API}/api/inventory`, { headers });
  if (!inv.ok) throw new Error(`GET /api/inventory → HTTP ${inv.status}`);
  const overview = (await inv.json()) as {
    rows: { id: string; sku: string }[];
    warehouses: { id: string; code: string }[];
  };

  for (const m of MOVEMENTS) {
    const product = overview.rows.find((r) => r.sku === m.sku);
    const warehouse = overview.warehouses.find((w) => w.code === m.wh);
    if (!product || !warehouse) throw new Error(`No existe ${m.sku} o ${m.wh}. ¿Corrió npm run db:seed?`);

    const res = await fetch(`${API}/api/movements`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        productId: product.id,
        warehouseId: warehouse.id,
        movementType: "PURCHASE_RECEIPT",
        quantity: m.quantity,
        unitCost: m.unitCost,
        referenceNote: m.note,
      }),
    });
    const body = await res.json();
    console.log(`${m.sku} +${m.quantity} en ${m.wh} → HTTP ${res.status}`, JSON.stringify(body));
    if (!res.ok) throw new Error("Movimiento rechazado. Abortado.");
  }
  console.log("Datos de ejemplo OK.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
