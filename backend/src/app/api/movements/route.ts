import { registerStockMovement } from "@/app/actions/inventory";
import type { StockMovementInput } from "@/lib/zod-schemas";
import { actionResponse, checkApiKey, internalError, readJson } from "../_lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = checkApiKey(req);
  if (denied) return denied;
  const parsed = await readJson(req);
  if ("response" in parsed) return parsed.response;
  try {
    // La validación (zod) la hace la propia acción; aquí solo se reenvía el cuerpo.
    return actionResponse(await registerStockMovement(parsed.body as StockMovementInput));
  } catch (e) {
    return internalError("POST /api/movements", e);
  }
}
