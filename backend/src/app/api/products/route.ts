import { createProduct } from "@/app/actions/inventory";
import { actionResponse, checkApiKey, internalError, readJson } from "../_lib/http";

export const dynamic = "force-dynamic";

/** Solo para pruebas de API: la web y la app no tienen pantalla para crear productos. */
export async function POST(req: Request) {
  const denied = checkApiKey(req);
  if (denied) return denied;
  const parsed = await readJson(req);
  if ("response" in parsed) return parsed.response;
  try {
    return actionResponse(await createProduct(parsed.body as Parameters<typeof createProduct>[0]));
  } catch (e) {
    return internalError("POST /api/products", e);
  }
}
