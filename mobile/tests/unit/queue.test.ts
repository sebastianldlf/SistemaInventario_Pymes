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

import { enqueue, getQueue, processQueue, QUEUE_KEY } from "../../src/offline/queue";
import type { StockMovementInput } from "../../src/shared/inventory";

const sampleMovement = (qty: number, note = ""): StockMovementInput => ({
  productId: "prod-1",
  warehouseId: "wh-1",
  movementType: "PURCHASE_RECEIPT",
  quantity: qty,
  unitCost: 10,
  referenceNote: note,
});

describe("[P0][TDD] Cola offline de movimientos (queue.ts)", () => {
  beforeEach(() => {
    store.clear();
  });

  it("encola movimientos en orden FIFO y retorna el tamaño actualizado", async () => {
    const size1 = await enqueue(sampleMovement(5, "M1"), new Date("2026-11-17T10:00:00.000Z"));
    const size2 = await enqueue(sampleMovement(3, "M2"), new Date("2026-11-17T10:01:00.000Z"));

    expect(size1).toBe(1);
    expect(size2).toBe(2);

    const queue = await getQueue();
    expect(queue).toHaveLength(2);
    expect(queue[0].payload.referenceNote).toBe("M1");
    expect(queue[1].payload.referenceNote).toBe("M2");
  });

  it("procesa todos los movimientos exitosos y deja la cola vacía", async () => {
    await enqueue(sampleMovement(4, "OK-1"));
    await enqueue(sampleMovement(2, "OK-2"));

    const result = await processQueue(async () => ({ kind: "ok" }));

    expect(result).toEqual({ sent: 2, rejected: [], stopped: false });
    expect(await getQueue()).toHaveLength(0);
  });

  it("desencola y reporta movimientos rechazados por el servidor sin detener los siguientes", async () => {
    await enqueue(sampleMovement(999, "RECHAZADO"));
    await enqueue(sampleMovement(1, "ACEPTADO"));

    const send = vi
      .fn()
      .mockResolvedValueOnce({ kind: "rejected", message: "Stock insuficiente" })
      .mockResolvedValueOnce({ kind: "ok" });

    const result = await processQueue(send);

    expect(result.sent).toBe(1);
    expect(result.stopped).toBe(false);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].message).toBe("Stock insuficiente");
    expect(await getQueue()).toHaveLength(0);
  });

  it("detiene la sincronización ante error de red y preserva el movimiento pendiente y los posteriores", async () => {
    await enqueue(sampleMovement(1, "PRIMERO"));
    await enqueue(sampleMovement(2, "SEGUNDO-FALLA-RED"));
    await enqueue(sampleMovement(3, "TERCERO-PENDIENTE"));

    const send = vi
      .fn()
      .mockResolvedValueOnce({ kind: "ok" })
      .mockResolvedValueOnce({ kind: "network" });

    const result = await processQueue(send);

    expect(result.sent).toBe(1);
    expect(result.stopped).toBe(true);
    expect(result.rejected).toHaveLength(0);

    const remaining = await getQueue();
    expect(remaining.map((i) => i.payload.referenceNote)).toEqual([
      "SEGUNDO-FALLA-RED",
      "TERCERO-PENDIENTE",
    ]);
  });

  it("resiste JSON corrupto en AsyncStorage devolviendo cola vacía", async () => {
    store.set(QUEUE_KEY, "{json-corrupto");
    expect(await getQueue()).toEqual([]);
  });
});
