import * as React from "react";
import { fetchInventory, NetworkError } from "../api";
import { loadInventoryCache, saveInventoryCache } from "../offline/storage";
import { onInventorySynced } from "../offline/sync";
import type { InventoryOverview } from "../shared/inventory";

export function useInventory() {
  const [data, setData] = React.useState<InventoryOverview | null>(null);
  /** Fecha de la copia local mostrada; null si los datos vienen del servidor. */
  const [cachedAt, setCachedAt] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async (mode: "initial" | "refresh" | "silent" = "initial") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    try {
      const fresh = await fetchInventory();
      setData(fresh);
      setCachedAt(null);
      setError(null);
      await saveInventoryCache(fresh);
    } catch (e) {
      if (e instanceof NetworkError) {
        const cache = await loadInventoryCache();
        if (cache) {
          setData(cache.data);
          setCachedAt(cache.savedAt);
          setError(null);
        } else {
          setError("No se pudo conectar con el servidor.");
        }
      } else {
        setError((e as Error).message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load("initial");
  }, [load]);

  React.useEffect(
    () =>
      onInventorySynced((fresh) => {
        setData(fresh);
        setCachedAt(null);
        setError(null);
      }),
    [],
  );

  return { data, cachedAt, error, loading, refreshing, reload: load };
}
