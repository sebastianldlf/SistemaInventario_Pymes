import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StockMovementInput } from "../shared/inventory";

export const QUEUE_KEY = "@tarima/movement-queue";

export interface QueuedMovement {
  queuedAt: string; // ISO 8601
  payload: StockMovementInput;
}

/** Resultado de enviar un movimiento de la cola al servidor. */
export type SendOutcome = { kind: "ok" } | { kind: "rejected"; message: string } | { kind: "network" };

export interface ProcessResult {
  sent: number;
  rejected: { item: QueuedMovement; message: string }[];
  /** true si se detuvo por un error de red; los movimientos restantes siguen en la cola. */
  stopped: boolean;
}

// Serializa las lecturas/escrituras de la cola para que encolar durante una sincronización no pierda datos.
let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn);
  chain = run.catch(() => undefined);
  return run;
}

async function read(): Promise<QueuedMovement[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function write(queue: QueuedMovement[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueue(): Promise<QueuedMovement[]> {
  return withLock(read);
}

/** Agrega un movimiento al final de la cola. Devuelve el nuevo tamaño. */
export function enqueue(payload: StockMovementInput, now = new Date()): Promise<number> {
  return withLock(async () => {
    const queue = await read();
    queue.push({ queuedAt: now.toISOString(), payload });
    await write(queue);
    return queue.length;
  });
}

/** Quita el primer elemento de la cola. Devuelve el nuevo tamaño. */
function dequeue(): Promise<number> {
  return withLock(async () => {
    const queue = await read();
    queue.shift();
    await write(queue);
    return queue.length;
  });
}

/**
 * Envía la cola en orden, uno por uno.
 * - ok: sale de la cola.
 * - rejected (respuesta HTTP de error): sale de la cola y se informa.
 * - network: se detiene; ese movimiento y los siguientes quedan en la cola.
 */
export async function processQueue(send: (payload: StockMovementInput) => Promise<SendOutcome>): Promise<ProcessResult> {
  const result: ProcessResult = { sent: 0, rejected: [], stopped: false };
  for (;;) {
    const [first] = await getQueue();
    if (!first) break;
    const outcome = await send(first.payload);
    if (outcome.kind === "network") {
      result.stopped = true;
      break;
    }
    await dequeue();
    if (outcome.kind === "ok") result.sent++;
    else result.rejected.push({ item: first, message: outcome.message });
  }
  return result;
}
