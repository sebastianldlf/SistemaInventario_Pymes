import { NextResponse } from "next/server";

/** Si existe API_KEY, exige el header x-api-key. Sin API_KEY la API queda abierta (solo desarrollo local). */
export function checkApiKey(req: Request): NextResponse | null {
  const key = process.env.API_KEY;
  if (!key) return null;
  if (req.headers.get("x-api-key") === key) return null;
  return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
}

export async function readJson(req: Request): Promise<{ body: unknown } | { response: NextResponse }> {
  try {
    return { body: await req.json() };
  } catch {
    return { response: NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 }) };
  }
}

/** 200 si la acción devolvió ok:true; 422 con el mismo cuerpo si devolvió ok:false. */
export function actionResponse(result: { ok: boolean }): NextResponse {
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}

export function internalError(scope: string, e: unknown): NextResponse {
  console.error(`[api ${scope}]`, e);
  return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
}
