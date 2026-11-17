import http from "node:http";

const PORT = Number(process.env.MOCK_API_PORT || 3002);

const state = {
  warehouses: [
    { id: "wh-1", code: "ALM-01", name: "Almacén Central" },
    { id: "wh-2", code: "ALM-02", name: "Almacén Norte" },
  ],
  categories: [
    { id: "cat-1", name: "Ferretería" },
    { id: "cat-2", name: "Eléctricos" },
  ],
  rows: [
    {
      id: "prod-1",
      sku: "FER-001",
      barcode: "7750001000011",
      name: "Tornillo Hexagonal 1/4",
      unitOfMeasure: "UND",
      categoryId: "cat-1",
      categoryName: "Ferretería",
      minStock: 20,
      averageCost: 1.5,
      salePrice: 2.5,
      totalStock: 50,
      stockByWarehouse: { "wh-1": 35, "wh-2": 15 },
      status: "NORMAL",
    },
    {
      id: "prod-2",
      sku: "ELE-002",
      barcode: "7750001000028",
      name: "Cable THW 12 AWG",
      unitOfMeasure: "MTR",
      categoryId: "cat-2",
      categoryName: "Eléctricos",
      minStock: 30,
      averageCost: 4.2,
      salePrice: 6.5,
      totalStock: 10,
      stockByWarehouse: { "wh-1": 10, "wh-2": 0 },
      status: "REORDER",
    },
    {
      id: "prod-3",
      sku: "FER-003",
      barcode: null,
      name: "Cinta Aislante Negra",
      unitOfMeasure: "UND",
      categoryId: "cat-1",
      categoryName: "Ferretería",
      minStock: 15,
      averageCost: 3.0,
      salePrice: 5.0,
      totalStock: 0,
      stockByWarehouse: { "wh-1": 0, "wh-2": 0 },
      status: "REORDER",
    },
  ],
};

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Accept, x-api-key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    return sendJson(res, 204, {});
  }

  if (req.method === "GET" && req.url === "/api/inventory") {
    return sendJson(res, 200, state);
  }

  if (req.method === "POST" && req.url === "/api/movements") {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        const body = JSON.parse(raw || "{}");
        const qty = Number(body.quantity);
        if (!body.productId || !body.warehouseId || !Number.isFinite(qty) || qty <= 0) {
          return sendJson(res, 422, {
            ok: false,
            error: "Datos de movimiento inválidos",
            fieldErrors: { quantity: ["La cantidad debe ser mayor a 0"] },
          });
        }
        const product = state.rows.find((r) => r.id === body.productId);
        if (!product) {
          return sendJson(res, 400, { ok: false, error: "Producto no encontrado" });
        }

        const isOut =
          body.movementType === "SALE_DISPATCH" ||
          (body.movementType === "ADJUSTMENT" && body.direction === "OUT");
        const currentWh = product.stockByWarehouse[body.warehouseId] ?? 0;

        if (isOut && currentWh < qty) {
          return sendJson(res, 422, {
            ok: false,
            error: "Stock insuficiente en el almacén seleccionado",
            fieldErrors: { quantity: ["Excede el disponible en almacén"] },
          });
        }

        const nextWh = isOut ? currentWh - qty : currentWh + qty;
        product.stockByWarehouse[body.warehouseId] = nextWh;
        product.totalStock = Object.values(product.stockByWarehouse).reduce((a, b) => a + b, 0);
        product.status = product.totalStock <= product.minStock ? "REORDER" : "NORMAL";

        return sendJson(res, 200, {
          ok: true,
          data: {
            kardexId: `kdx-${Date.now()}`,
            balanceQuantity: product.totalStock,
            averageCost: product.averageCost,
          },
        });
      } catch {
        return sendJson(res, 400, { ok: false, error: "JSON inválido" });
      }
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Mock API listening on http://127.0.0.1:${PORT}`);
});
