import assert from "node:assert/strict";
import { Before, Given, Then, When, type DataTable } from "@cucumber/cucumber";
import type { InventoryRow, MovementType } from "../../../src/shared/inventory.js";

// En-memory queue simulation matching src/offline/queue.ts contract (for Node/Cucumber without RN native runtime)
interface QueuedItem {
  queuedAt: string;
  payload: {
    productId: string;
    warehouseId: string;
    movementType: MovementType;
    quantity: number;
  };
}

let queue: QueuedItem[] = [];
let lastSyncResult = { sent: 0, stopped: false };
let inventoryRows: InventoryRow[] = [];
let filteredRows: InventoryRow[] = [];

Before(() => {
  queue = [];
  lastSyncResult = { sent: 0, stopped: false };
  inventoryRows = [];
  filteredRows = [];
});

Given("que la cola offline está vacía", () => {
  queue = [];
});

When(
  "registro sin conexión una {string} de {int} unidades para el producto {string}",
  (movementType: string, quantity: number, productId: string) => {
    queue.push({
      queuedAt: new Date().toISOString(),
      payload: {
        productId,
        warehouseId: "wh-1",
        movementType: movementType as MovementType,
        quantity,
      },
    });
  },
);

Then("la cola offline debe tener {int} movimientos pendientes", (expected: number) => {
  assert.equal(queue.length, expected);
});

Then("la cola offline debe conservar {int} movimiento pendiente", (expected: number) => {
  assert.equal(queue.length, expected);
});

When("se recupera la conexión y el servidor acepta todos los movimientos", () => {
  let sent = 0;
  while (queue.length > 0) {
    queue.shift();
    sent++;
  }
  lastSyncResult = { sent, stopped: false };
});

When("el servidor falla por red en el segundo movimiento", () => {
  let sent = 0;
  let stopped = false;
  let index = 0;
  while (queue.length > 0) {
    index++;
    if (index === 2) {
      stopped = true;
      break;
    }
    queue.shift();
    sent++;
  }
  lastSyncResult = { sent, stopped };
});

Then("se deben haber enviado {int} movimientos", (expected: number) => {
  assert.equal(lastSyncResult.sent, expected);
});

Then("se debe haber enviado {int} movimiento", (expected: number) => {
  assert.equal(lastSyncResult.sent, expected);
});

Then("la sincronización debe haberse detenido por error de red", () => {
  assert.equal(lastSyncResult.stopped, true);
});

Then("la cola offline debe quedar vacía", () => {
  assert.equal(queue.length, 0);
});

Given("el siguiente inventario cargado en la aplicación:", (table: DataTable) => {
  inventoryRows = table.hashes().map((r) => ({
    id: r.id,
    sku: r.sku,
    barcode: r.barcode || null,
    name: r.name,
    unitOfMeasure: "UND",
    categoryId: r.categoryId,
    categoryName: r.categoryId,
    minStock: Number(r.minStock),
    averageCost: 1,
    salePrice: 2,
    totalStock: Number(r.totalStock),
    stockByWarehouse: { "wh-1": Number(r.totalStock) },
    status: r.status as "NORMAL" | "REORDER",
  }));
  filteredRows = [...inventoryRows];
});

When("aplico el filtro de estado {string}", (status: string) => {
  const isOut = (r: InventoryRow) => r.totalStock <= 0;
  const isLow = (r: InventoryRow) => r.status === "REORDER" && !isOut(r);
  filteredRows = inventoryRows.filter((r) =>
    status === "ALL" ? true : status === "LOW" ? isLow(r) : isOut(r),
  );
});

When("busco el texto {string}", (query: string) => {
  const q = query.trim().toLowerCase();
  filteredRows = inventoryRows.filter(
    (r) =>
      !q ||
      r.sku.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      Boolean(r.barcode?.includes(q)),
  );
});

Then("debo ver {int} producto en la lista", (expected: number) => {
  assert.equal(filteredRows.length, expected);
});

Then("la lista debe incluir el SKU {string}", (sku: string) => {
  assert.ok(
    filteredRows.some((r) => r.sku === sku),
    `Expected SKU ${sku} in filtered results`,
  );
});
