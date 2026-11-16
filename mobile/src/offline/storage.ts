import AsyncStorage from "@react-native-async-storage/async-storage";
import type { InventoryOverview } from "../shared/inventory";

export const CACHE_KEY = "@tarima/inventory-cache";

export interface InventoryCache {
  savedAt: string; // ISO 8601
  data: InventoryOverview;
}

/** Guarda la última respuesta exitosa de GET /api/inventory. */
export async function saveInventoryCache(data: InventoryOverview, now = new Date()): Promise<void> {
  const entry: InventoryCache = { savedAt: now.toISOString(), data };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
}

export async function loadInventoryCache(): Promise<InventoryCache | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InventoryCache;
  } catch {
    return null;
  }
}

/** "dd/mm hh:mm" en la hora local del dispositivo. */
export function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
