import { API_KEY, API_URL, GET_TIMEOUT_MS, POST_TIMEOUT_MS } from "./config";
import type { InventoryOverview, MovementResult, StockMovementInput } from "./shared/inventory";

/** No hubo respuesta HTTP: sin conexión, servidor inalcanzable o timeout. */
export class NetworkError extends Error {
  constructor(readonly reason: "offline" | "timeout") {
    super(reason === "timeout" ? "Tiempo de espera agotado" : "Sin conexión con el servidor");
    this.name = "NetworkError";
  }
}

/** Hubo respuesta HTTP pero no fue la esperada (p. ej. 500 en GET). */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(
      (body as { error?: string } | null)?.error ?? `Error del servidor (HTTP ${status})`,
    );
    this.name = "HttpError";
  }
}

export interface HttpResponse<T> {
  status: number;
  /** null si el cuerpo no era JSON. */
  body: T | null;
}

async function request<T>(path: string, init: RequestInit, timeoutMs: number): Promise<HttpResponse<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body) headers["Content-Type"] = "application/json";
  if (API_KEY) headers["x-api-key"] = API_KEY;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers, signal: controller.signal });
  } catch {
    throw new NetworkError(controller.signal.aborted ? "timeout" : "offline");
  } finally {
    clearTimeout(timer);
  }

  let body: T | null = null;
  try {
    body = (await res.json()) as T;
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

/** Lanza NetworkError o HttpError si no obtiene un 200. */
export async function fetchInventory(): Promise<InventoryOverview> {
  const res = await request<InventoryOverview>("/api/inventory", { method: "GET" }, GET_TIMEOUT_MS);
  if (res.status !== 200 || !res.body) throw new HttpError(res.status, res.body);
  return res.body;
}

/** Devuelve cualquier respuesta HTTP (200, 400, 422, 500…). Solo lanza NetworkError. */
export function postMovement(input: StockMovementInput): Promise<HttpResponse<MovementResult>> {
  return request<MovementResult>("/api/movements", { method: "POST", body: JSON.stringify(input) }, POST_TIMEOUT_MS);
}
