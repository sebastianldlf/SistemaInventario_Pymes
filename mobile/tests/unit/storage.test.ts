import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => store.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  },
}));

import { CACHE_KEY, formatSavedAt, loadInventoryCache, saveInventoryCache } from "../../src/offline/storage";
import type { InventoryOverview } from "../../src/shared/inventory";

const sampleInventory: InventoryOverview = {
  rows: [
    {
      id: "prod-1",
      sku: "FER-001",
      barcode: "7750001000011",
      name: "Tornillo Hexagonal",
      unitOfMeasure: "UND",
      categoryId: "cat-1",
      categoryName: "Ferretería",
      minStock: 10,
      averageCost: 1.5,
      salePrice: 2.5,
      totalStock: 25,
      stockByWarehouse: { "wh-1": 25 },
      status: "NORMAL",
    },
  ],
  categories: [{ id: "cat-1", name: "Ferretería" }],
  warehouses: [{ id: "wh-1", code: "ALM-01", name: "Central" }],
};

describe("[P0/P2][TDD] Cache local de inventario (storage.ts)", () => {
  beforeEach(() => {
    store.clear();
  });

  it("[P0] guarda y recupera el snapshot de inventario con su marca temporal", async () => {
    const fixedDate = new Date("2026-11-17T14:30:00.000Z");
    await saveInventoryCache(sampleInventory, fixedDate);

    const cached = await loadInventoryCache();
    expect(cached).not.toBeNull();
    expect(cached?.savedAt).toBe("2026-11-17T14:30:00.000Z");
    expect(cached?.data.rows).toHaveLength(1);
    expect(cached?.data.rows[0].sku).toBe("FER-001");
  });

  it("[P0] retorna null si no existe cache o el JSON está dañado", async () => {
    expect(await loadInventoryCache()).toBeNull();
    store.set(CACHE_KEY, "invalid-json");
    expect(await loadInventoryCache()).toBeNull();
  });

  it("[P2] formatea la fecha de respaldo en formato dd/mm hh:mm", () => {
    const d = new Date(2026, 10, 5, 9, 4); // 05/11 09:04 hora local
    expect(formatSavedAt(d.toISOString())).toBe("05/11 09:04");
  });
});
