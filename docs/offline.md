# Modo offline (versión 1)

Objetivo: que la app siga siendo útil sin conexión, con una solución simple. No hay cambios optimistas: la lista siempre muestra lo que dijo el servidor, en vivo o de la última copia guardada.

## Claves de almacenamiento (AsyncStorage)

| Clave | Contenido | Escribe | Lee |
|---|---|---|---|
| `@tarima/inventory-cache` | `{ savedAt: ISO-8601, data: InventoryOverview }`, la última respuesta 200 de `GET /api/inventory` | `useInventory` (cada carga exitosa) y `syncNow` (al terminar) | `useInventory` cuando falla la red |
| `@tarima/movement-queue` | `[{ queuedAt: ISO-8601, payload: StockMovementInput }]` en orden de llegada | `enqueue` (hoja de movimiento ante error de red) | `processQueue` (sincronización) |

`payload` es exactamente el cuerpo que se habría enviado a `POST /api/movements`.

## Módulos

| Archivo | Responsabilidad |
|---|---|
| `mobile/src/offline/storage.ts` | Guardar y leer la cache, formatear su fecha (`dd/mm hh:mm`). |
| `mobile/src/offline/queue.ts` | Cola en AsyncStorage: `getQueue`, `enqueue`, `processQueue(send)`. Las escrituras se serializan con un candado en memoria para no perder un movimiento encolado durante una sincronización. |
| `mobile/src/offline/useConnectivity.ts` | Hook sobre NetInfo; dispara un callback al pasar de desconectado a conectado. |
| `mobile/src/offline/sync.ts` | `syncNow()`, `queueMovement()`, contador de pendientes compartido (`useOfflineState`) y aviso de inventario nuevo (`onInventorySynced`). |

## Flujos

### Carga del inventario

```
GET /api/inventory (timeout 10 s)
├─ 200 → muestra los datos y guarda la cache (savedAt = ahora)
├─ error de red o timeout (NetworkError)
│   ├─ hay cache → muestra la cache + banner fijo "Sin conexión · datos del dd/mm hh:mm"
│   └─ no hay cache → pantalla de error "No se pudo conectar con el servidor." + "Reintentar"
└─ respuesta HTTP no 200 (p. ej. 500) → pantalla de error con el mensaje del servidor (no usa la cache)
```

El banner desaparece en cuanto una carga, un pull-to-refresh o una sincronización traen datos del servidor.

### Registrar un movimiento

```
POST /api/movements (timeout 20 s)
├─ 200 ok:true → recarga el inventario y cierra la hoja (igual que la web)
├─ 4xx / 422 / 500 → muestra el error en la hoja (igual que la web), no se encola
└─ NetworkError → encola el payload con su fecha, cierra la hoja y muestra "N pendientes"
                  (la lista no cambia)
```

### Sincronización (`syncNow`)

Se dispara en tres casos:

1. Al abrir la app (`_layout.tsx`, al montar).
2. Cuando NetInfo informa que volvió la conexión (`isConnected` pasa de `false` a `true`).
3. Con el botón "Sincronizar ahora" (visible solo si hay pendientes).

Si ya hay una sincronización en curso, las llamadas siguientes esperan a esa misma (no se envía dos veces).

```
mientras la cola tenga elementos:
  envía el primero a POST /api/movements
  ├─ 200 ok:true          → sale de la cola
  ├─ respuesta HTTP error → sale de la cola + Alert "Movimiento rechazado" con el mensaje del servidor
  └─ NetworkError         → se detiene; ese y los siguientes quedan para la próxima vez
si no se detuvo: GET /api/inventory → actualiza la pantalla y la cache
```

Cualquier respuesta HTTP de error (400, 401, 422, 500) cuenta como rechazo y quita el movimiento de la cola. Se eligió así para que un 500 posterior a un commit (ver H-03 en `hallazgos.md`) no se reintente y duplique el movimiento. Consecuencia: si `EXPO_PUBLIC_API_KEY` es incorrecta (401), los pendientes se descartan con un alert cada uno.

## Detección de conexión

Se usa `isConnected` de NetInfo, no `isInternetReachable`. El backend suele estar en la LAN, y una Wi-Fi sin salida a Internet daría falsos "sin conexión". El banner no depende de NetInfo: aparece solo cuando una carga falló por red y se está mostrando la cache.

## Comportamientos que conviene probar (auditoría)

- **Timeout con commit en el servidor:** si el servidor hace commit pero la respuesta llega después de 20 s, la app encola el movimiento y, al sincronizar, lo registra **otra vez**. No hay ids de idempotencia en esta versión.
- **Servidor caído con Wi-Fi activa:** NetInfo sigue informando "conectado", así que no hay sincronización automática al reiniciar el servidor. Hay que usar "Sincronizar ahora", pull-to-refresh (solo recarga) o reabrir la app.
- **Rechazo al sincronizar:** un movimiento válido cuando se encoló puede ser rechazado después (por ejemplo, "Stock insuficiente…" si otro dispositivo vendió antes). Se informa con un alert y se descarta.
- **Orden:** la cola se envía en el orden en que se registró, uno por uno.

## Cómo probarlo

1. Con el backend corriendo, abre Inventario (se guarda la cache).
2. Activa el modo avión, o detén el backend con Ctrl+C, y haz pull-to-refresh: debe aparecer el banner "Sin conexión · datos del …".
3. Registra un movimiento: la hoja se cierra y aparece "1 pendientes".
4. Desactiva el modo avión (sincroniza solo) o levanta el backend y pulsa "Sincronizar ahora": el contador desaparece y la lista se actualiza.
5. Para probar un rechazo: encola una "Salida por venta" mayor al stock disponible y sincroniza. Debe aparecer el alert "Stock insuficiente en ALM-0X…".
