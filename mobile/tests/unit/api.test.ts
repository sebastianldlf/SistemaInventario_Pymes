import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/config", () => ({
  API_URL: "http://127.0.0.1:3002",
  API_KEY: "test-secret-key",
  GET_TIMEOUT_MS: 1000,
  POST_TIMEOUT_MS: 1000,
}));

import { fetchInventory, HttpError, NetworkError, postMovement } from "../../src/api";

describe("[P0/P1][TDD] Cliente HTTP móvil (api.ts)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("[P0] fetchInventory obtiene datos válidos y envía x-api-key", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ rows: [], categories: [], warehouses: [] }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const data = await fetchInventory();
    expect(data).toEqual({ rows: [], categories: [], warehouses: [] });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://127.0.0.1:3002/api/inventory",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Accept: "application/json",
          "x-api-key": "test-secret-key",
        }),
      }),
    );
  });

  it("[P1] fetchInventory lanza HttpError cuando el servidor responde 500", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 500,
      json: async () => ({ error: "Fallo interno" }),
    }) as unknown as typeof fetch;

    await expect(fetchInventory()).rejects.toMatchObject({
      name: "HttpError",
      status: 500,
      message: "Fallo interno",
    });
    await expect(fetchInventory()).rejects.toBeInstanceOf(HttpError);
  });

  it("[P0] postMovement retorna NetworkError('offline') cuando fetch falla por red", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Network request failed")) as unknown as typeof fetch;

    await expect(
      postMovement({
        productId: "prod-1",
        warehouseId: "wh-1",
        movementType: "PURCHASE_RECEIPT",
        quantity: 5,
      }),
    ).rejects.toMatchObject({
      name: "NetworkError",
      reason: "offline",
    });
  });

  it("[P1] postMovement retorna status 422 y body estructurado sin lanzar excepción", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 422,
      json: async () => ({
        ok: false,
        error: "Validación fallida",
        fieldErrors: { quantity: ["Debe ser mayor a cero"] },
      }),
    }) as unknown as typeof fetch;

    const res = await postMovement({
      productId: "prod-1",
      warehouseId: "wh-1",
      movementType: "SALE_DISPATCH",
      quantity: 0,
    });

    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      ok: false,
      error: "Validación fallida",
      fieldErrors: { quantity: ["Debe ser mayor a cero"] },
    });
  });
});
