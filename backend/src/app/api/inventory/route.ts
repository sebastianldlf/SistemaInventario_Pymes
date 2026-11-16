import { NextResponse } from "next/server";
import { getInventoryOverview } from "@/app/actions/inventory";
import { checkApiKey, internalError } from "../_lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = checkApiKey(req);
  if (denied) return denied;
  try {
    return NextResponse.json(await getInventoryOverview());
  } catch (e) {
    return internalError("GET /api/inventory", e);
  }
}
