# Hallazgos

Cosas de la web original que parecen incorrectas o mejorables. **No se corrigieron**: la app replica la web y el backend no se modificó.
Las rutas son relativas a `backend/` salvo que se indique otra cosa. Los números de línea corresponden al clon del 2026-11-16.

Severidad: **Alta** (seguridad o pérdida de integridad de datos) · **Media** (comportamiento incorrecto o riesgo operativo) · **Baja** (detalle visible o de mantenibilidad) · **Obs.** (observación sin impacto visible).

| ID | Sev. | Resumen |
|---|---|---|
| H-01 | Alta | `.env` con credenciales de la base commiteado en el repo público |
| H-02 | Alta | Las Server Actions no tienen autenticación |
| H-03 | Media | `revalidatePath` corre después del commit y dentro del `try` |
| H-04 | Media | El `.env` del repo apunta a un proyecto Supabase que ya no existe |
| H-05 | Media | `getInventoryOverview` carga todo el catálogo sin paginar |
| H-06 | Baja | La búsqueda no pasa a minúsculas el código de barras |
| H-07 | Baja | "1 productos": el subtítulo no pluraliza "productos" |
| H-08 | Baja | `createProduct` existe pero no hay pantalla que lo use |
| H-09 | Baja | El diálogo de movimiento se puede cerrar mientras envía |
| H-10 | Obs. | `status` del servidor e `isOut`/`isLow` del cliente se solapan |

---

### H-01 · Alta · `.env` con credenciales commiteado en el repo público

- **Dónde:** `.env` (raíz del repo) y `.gitignore:5`, que solo ignora `.env*.local`.
- **Qué:** el repo público incluye `DATABASE_URL` y `DIRECT_URL` con usuario y contraseña de Supabase.
- **Por qué se notó:** al clonar, el `.env` ya venía con valores reales.
- **Impacto:** cualquiera con acceso al repo podía leer o escribir la base, incluido el Kardex "inmutable". Aunque el proyecto ya no exista (H-04), la contraseña queda en el historial de git.
- **Reproducir:** `git clone https://github.com/sebastianldlf/SistemaInventario_Pymes && cat SistemaInventario_Pymes/.env`.
- **Mitigación en este proyecto:** `backend/.env` está en el `.gitignore` de la raíz.

### H-02 · Alta · Las Server Actions no tienen autenticación

- **Dónde:** `src/app/actions/inventory.ts:1` (`"use server"`) y todas sus funciones exportadas.
- **Qué:** `registerStockMovement` y `createProduct` son endpoints POST que Next expone públicamente; no verifican sesión ni rol. La web no tiene login.
- **Impacto:** cualquiera que alcance el servidor puede registrar movimientos (filas permanentes en el Kardex) o crear productos.
- **Reproducir:** abre `/inventario`, registra un movimiento con las DevTools abiertas y copia la petición POST (header `Next-Action`). Repetida con `curl` desde otra máquina, registra otro movimiento sin credenciales.
- **Nota:** la API REST nueva (`src/app/api/**`) tiene la misma exposición si no se define `API_KEY`. La clave `EXPO_PUBLIC_API_KEY` viaja dentro del bundle de la app, así que es una barrera mínima, no autenticación.

### H-03 · Media · `revalidatePath` corre después del commit y dentro del `try`

- **Dónde:** `src/app/actions/inventory.ts:210` (`registerStockMovement`) y `:105` (`createProduct`).
- **Qué:** `prisma.$transaction(...)` ya hizo commit cuando se llama `revalidatePath("/inventario")`. Si esa llamada (o cualquier línea posterior al commit) lanza una excepción, el `catch` de la línea 222 devuelve `{ ok:false, error:"Error interno al registrar el movimiento" }`, **aunque el movimiento ya quedó en el Kardex**.
- **Por qué se notó:** `revalidatePath` lanza `Invariant: static generation store missing in revalidatePath /inventario` fuera del runtime de Next (comprobado con `node -e 'require("next/cache").revalidatePath("/inventario")'`). Por eso `scripts/demo-data.ts` usa la API en vez de llamar a la acción directamente.
- **Impacto:** el cliente recibe un error y la operación sí se hizo. **Si la API devuelve 500 (o 422 con "Error interno…") después de un commit, un cliente que reintente duplicaría el movimiento en el Kardex**, que es inmutable, y la corrección necesitaría un ajuste manual. La cola offline de la app (F3) reintenta solo errores de red o timeout, no respuestas HTTP. Aun así, un timeout del cliente después de que el servidor hizo commit produce el mismo efecto (ver `offline.md`).
- **Reproducir (solo en una base de pruebas):** con `npx tsx`, llama `registerStockMovement` directamente fuera de Next con un movimiento válido. Devuelve "Error interno al registrar el movimiento" y aun así `SELECT count(*) FROM "KardexEntry"` aumenta en 1.

### H-04 · Media · El `.env` del repo apunta a un proyecto Supabase que ya no existe

- **Dónde:** `.env`.
- **Qué:** el pooler responde `FATAL XX000 (ENOTFOUND) tenant/user postgres.<ref> not found`, y Prisma informa `Can't reach database server`.
- **Impacto:** el proyecto no arranca tal como se clona; `/inventario` falla con error 500. El README de la web no explica cómo crear una base propia.
- **Reproducir:** clonar, `npm install`, `npm run dev`, abrir `/inventario`. Con la API nueva: `GET /api/inventory` → `500 {"ok":false,"error":"Error interno"}`.

### H-05 · Media · `getInventoryOverview` carga todo el catálogo sin paginar

- **Dónde:** `src/app/actions/inventory.ts:51-58` (`prisma.product.findMany` sin `take`/`skip`) y `src/app/inventario/page.tsx:12`.
- **Qué:** cada carga trae todos los productos con su stock, todas las categorías y todos los almacenes; el filtrado se hace en el cliente.
- **Impacto:** el tiempo de respuesta, el tamaño del JSON y la memoria crecen linealmente con el catálogo. En móvil pesa más (datos, y la cache offline guarda la respuesta completa).
- **Reproducir:** crea miles de productos (por ejemplo, con `POST /api/products` en bucle en una base de pruebas) y mide `curl -w "%{size_download} %{time_total}" /api/inventory`.

### H-06 · Baja · La búsqueda no pasa a minúsculas el código de barras

- **Dónde:** `src/components/inventory/InventoryTable.tsx:43`: `r.barcode?.includes(q)`, mientras SKU y nombre usan `.toLowerCase()`.
- **Qué:** la consulta `q` se pasa a minúsculas, pero el código de barras no. Un código con letras mayúsculas nunca coincide.
- **Por qué no se ve con el seed:** los códigos del seed son numéricos.
- **Reproducir:** crea un producto con `barcode: "ABC-123"` y busca `ABC` o `abc`: "Sin resultados". La app replica este comportamiento.

### H-07 · Baja · "1 productos": el subtítulo no pluraliza "productos"

- **Dónde:** `src/components/inventory/InventoryTable.tsx:65`.
- **Qué:** pluraliza "almacén/almacenes", pero "productos" queda fijo.
- **Reproducir:** una base con un solo producto muestra "1 productos en 2 almacenes".

### H-08 · Baja · `createProduct` existe pero no hay pantalla que lo use

- **Dónde:** `src/app/actions/inventory.ts:96`.
- **Qué:** la acción está implementada y validada, pero ninguna página la invoca. Los productos solo llegan por el seed.
- **Impacto:** funcionalidad sin uso desde la UI, sin pruebas de UI posibles. La API nueva la expone en `POST /api/products` solo para pruebas.
- **Reproducir:** `grep -rn createProduct src/` → solo aparece su definición.

### H-09 · Baja · El diálogo de movimiento se puede cerrar mientras envía

- **Dónde:** `src/components/inventory/MovementModal.tsx:24`: `Dialog onOpenChange={onOpenChange}` sin condición sobre `pending`.
- **Qué:** "Cancelar" se deshabilita mientras envía, pero Esc o un clic fuera del diálogo lo siguen cerrando. Si el servidor responde con error, el mensaje se pierde porque el formulario ya se desmontó.
- **Reproducir:** con la red limitada en las DevTools (Slow 3G), registra una salida con stock insuficiente y pulsa Esc antes de la respuesta: el diálogo se cierra y no aparece el error.
- **En la app:** se replica. El fondo de la hoja y el botón Atrás de Android la cierran aunque esté enviando.

### H-10 · Obs. · `status` del servidor e `isOut`/`isLow` del cliente se solapan

- **Dónde:** `src/app/actions/inventory.ts:81` (`status = total <= minStock ? "REORDER" : "NORMAL"`) y `src/components/inventory/InventoryTable.tsx:20-21`.
- **Qué:** un producto con stock 0 queda `REORDER` (siempre, porque `minStock >= 0`), aunque en realidad está agotado.
- **Impacto bajo:** `isLow = REORDER && !isOut` lo neutraliza en pantalla: se muestra "Agotado" y no cuenta en "Bajo mínimo". Solo afecta a quien consuma `status` directamente desde la API.
- **Reproducir:** `GET /api/inventory` → FER-0002 (stock 0) trae `"status":"REORDER"`.

---

## Diferencias inevitables web → mobile

| ID | Web | Mobile | Motivo |
|---|---|---|---|
| D-01 | Cantidad vacía: el navegador bloquea el envío por `required` (`MovementModal.tsx:163`). | Se envía y responde el servidor: 422 "Datos inválidos", bajo el campo "La cantidad debe ser mayor a 0". | `TextInput` no tiene `required`; la validación es solo la del servidor. Comprobado con `stockMovementSchema.safeParse`. |
| D-02 | Tabla con una columna por almacén. | Tarjeta por producto con chips "ALM-01 950". | Ancho de pantalla. |
| D-03 | `<select>` nativo. | Componente `Select` propio (`Modal` + lista). | Expo Go no trae un picker equivalente sin dependencias. |
| D-04 | `Intl.NumberFormat("es-PE")`. | Formateo manual equivalente (`mobile/src/lib/format.ts`). | El soporte de locales de `Intl` en Hermes depende de la plataforma. Comparado contra Node (ICU 78.2): 34/34 casos fijos y 200 000/200 000 aleatorios iguales. |
| D-05 | Botón de icono por fila, visible al pasar el mouse. | Botón "Registrar movimiento" siempre visible. | No hay hover en táctil. |
| D-06 | Resumen en 4 columnas desde `lg`. | Siempre 2×2. | Ancho de pantalla. |
| D-07 | Sin estados de carga ni de error de red (renderizado en servidor). | Spinner, error "No se pudo conectar con el servidor." + "Reintentar", pull-to-refresh. | La app consume la API por red. |
| D-08 | La acción se invoca directamente (Server Action). | `GET /api/inventory` y `POST /api/movements`, con 400, 401, 422 y 500 (ver `api.md`). | La app no puede llamar a Server Actions. |
| D-09 | `autoFocus` en Cantidad. | Igual: el teclado aparece al abrir la hoja. | Fidelidad. |
