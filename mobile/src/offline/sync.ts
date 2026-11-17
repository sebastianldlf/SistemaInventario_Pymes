import * as React from "react";
import { Alert } from "react-native";
import { fetchInventory, NetworkError, postMovement } from "../api";
import { MOVEMENT_LABELS, type InventoryOverview, type StockMovementInput } from "../shared/inventory";
import { enqueue, getQueue, processQueue, type SendOutcome } from "./queue";
import { saveInventoryCache } from "./storage";

/* Estado compartido: movimientos pendientes y si hay una sincronización en curso. */

interface OfflineState {
  pending: number;
  syncing: boolean;
}

let state: OfflineState = { pending: 0, syncing: false };
const stateListeners = new Set<() => void>();
const inventoryListeners = new Set<(data: InventoryOverview) => void>();

function setState(patch: Partial<OfflineState>) {
  state = { ...state, ...patch };
  stateListeners.forEach((l) => l());
}

export function useOfflineState(): OfflineState {
  return React.useSyncExternalStore(
    (l) => {
      stateListeners.add(l);
      return () => stateListeners.delete(l);
    },
    () => state,
  );
}

/** Avisa cuando la sincronización trae un inventario nuevo del servidor. */
export function onInventorySynced(listener: (data: InventoryOverview) => void): () => void {
  inventoryListeners.add(listener);
  return () => inventoryListeners.delete(listener);
}

export async function refreshPending(): Promise<void> {
  setState({ pending: (await getQueue()).length });
}

/** Guarda en la cola un movimiento que no se pudo enviar por falta de conexión. */
export async function queueMovement(payload: StockMovementInput): Promise<void> {
  setState({ pending: await enqueue(payload) });
}

async function send(payload: StockMovementInput): Promise<SendOutcome> {
  try {
    const res = await postMovement(payload);
    if (res.body?.ok) return { kind: "ok" };
    if (res.body && !res.body.ok) {
      const firstField = Object.values(res.body.fieldErrors ?? {}).find((m) => m?.[0])?.[0];
      return { kind: "rejected", message: firstField ? `${res.body.error}: ${firstField}` : res.body.error };
    }
    return { kind: "rejected", message: `Error del servidor (HTTP ${res.status})` };
  } catch (e) {
    if (e instanceof NetworkError) return { kind: "network" };
    throw e;
  }
}

let running: Promise<void> | null = null;

/**
 * Envía la cola en orden y luego vuelve a pedir el inventario (y actualiza la cache).
 * Si ya hay una sincronización en curso, devuelve esa misma.
 */
export function syncNow(): Promise<void> {
  if (running) return running;
  running = (async () => {
    setState({ syncing: true });
    try {
      const result = await processQueue(send);
      for (const { item, message } of result.rejected) {
        Alert.alert("Movimiento rechazado", `${MOVEMENT_LABELS[item.payload.movementType]} · cantidad ${item.payload.quantity}\n${message}`);
      }
      await refreshPending();
      if (result.stopped) return;
      try {
        const data = await fetchInventory();
        await saveInventoryCache(data);
        inventoryListeners.forEach((l) => l(data));
      } catch {
        // Sin inventario nuevo: la pantalla conserva lo que tenía.
      }
    } finally {
      setState({ syncing: false });
      running = null;
    }
  })();
  return running;
}
