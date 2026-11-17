import { expect, test } from "@playwright/test";

const MOCK_INVENTORY = {
  warehouses: [
    { id: "wh-1", code: "ALM-01", name: "Almacén Central" },
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
      stockByWarehouse: { "wh-1": 50 },
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
      stockByWarehouse: { "wh-1": 10 },
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
      stockByWarehouse: { "wh-1": 0 },
      status: "REORDER",
    },
  ],
};

test.describe("Tarima Mobile E2E (Expo Web - Viewport Móvil)", () => {
  test("[P0] Navega a inventario, muestra KPIs y registra movimiento de entrada", async ({ page }) => {
    let inventoryState = structuredClone(MOCK_INVENTORY);
    let postedBody: Record<string, unknown> | null = null;

    await page.route("**/api/inventory", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(inventoryState),
      });
    });

    await page.route("**/api/movements", async (route) => {
      postedBody = route.request().postDataJSON() as Record<string, unknown>;
      inventoryState.rows[0].totalStock += Number(postedBody.quantity);
      inventoryState.rows[0].stockByWarehouse["wh-1"] += Number(postedBody.quantity);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            kardexId: "kdx-e2e-1",
            balanceQuantity: inventoryState.rows[0].totalStock,
            averageCost: 1.5,
          },
        }),
      });
    });

    await page.goto("/");
    await page.getByTestId("btn-abrir-inventario").click();

    await expect(page.getByTestId("subtitulo")).toContainText("3 productos en 1 almacén");
    await expect(page.getByText("Tornillo Hexagonal 1/4")).toBeVisible();

    await page.getByTestId("btn-movimiento").click();
    await expect(page.getByTestId("form-movimiento")).toBeVisible();

    await page.getByTestId("mv-qty").fill("5");
    await page.getByTestId("mv-note").fill("GUIA-E2E-01");
    await page.getByTestId("btn-registrar").click();

    await expect(page.getByTestId("form-movimiento")).toBeHidden();
    expect(postedBody).toMatchObject({
      productId: "prod-1",
      warehouseId: "wh-1",
      movementType: "PURCHASE_RECEIPT",
      quantity: "5",
      referenceNote: "GUIA-E2E-01",
    });
  });

  test("[P0] Encola movimiento sin conexión y sincroniza al recuperar la red", async ({ page }) => {
    let isOffline = false;

    await page.route("**/api/inventory", async (route) => {
      if (isOffline) return route.abort("failed");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_INVENTORY),
      });
    });

    await page.route("**/api/movements", async (route) => {
      if (isOffline) return route.abort("failed");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { kardexId: "kdx-sync-1", balanceQuantity: 55, averageCost: 1.5 },
        }),
      });
    });

    await page.goto("/inventario");
    await expect(page.getByText("Tornillo Hexagonal 1/4")).toBeVisible();

    // Simular pérdida de conexión al registrar movimiento
    isOffline = true;
    await page.getByTestId("btn-movimiento").click();
    await page.getByTestId("mv-qty").fill("4");
    await page.getByTestId("btn-registrar").click();

    await expect(page.getByTestId("badge-pendientes")).toContainText("1 pendientes");

    // Recuperar conexión y sincronizar
    isOffline = false;
    await page.getByTestId("btn-sincronizar").click();

    await expect(page.getByTestId("badge-pendientes")).toBeHidden();
  });

  test("[P1] Filtra por estado Bajo mínimo y Agotados", async ({ page }) => {
    await page.route("**/api/inventory", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_INVENTORY),
      });
    });

    await page.goto("/inventario");
    await expect(page.getByText("Tornillo Hexagonal 1/4")).toBeVisible();

    await page.getByTestId("chip-bajo-minimo").click();
    await expect(page.getByText("Cable THW 12 AWG")).toBeVisible();
    await expect(page.getByText("Tornillo Hexagonal 1/4")).toBeHidden();
    await expect(page.getByText("Cinta Aislante Negra")).toBeHidden();

    await page.getByTestId("chip-agotados").click();
    await expect(page.getByText("Cinta Aislante Negra")).toBeVisible();
    await expect(page.getByText("Cable THW 12 AWG")).toBeHidden();
  });
});
