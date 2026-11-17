# Estrategia de Pruebas y Automatización — `tarima-mobile`

Este documento define la estrategia de automatización de pruebas, metodologías (**TDD** y **BDD/ATDD**), integración continua (**CI/CD**) y **priorización según valor del producto** para la aplicación móvil `tarima-mobile` (Expo / React Native / TypeScript).

---

## 1. Priorización de pruebas según valor del producto

Las pruebas se priorizan según el impacto directo en la operación de una PyME (control de existencias, costo promedio ponderado y continuidad operativa sin internet en almacén):

| Prioridad | Criterio de valor de negocio | Módulos / Flujos cubiertos | Herramientas | Frecuencia en CI/CD |
| :--- | :--- | :--- | :--- | :--- |
| **P0 — Crítico** | **Integridad de stock, Kardex y cero pérdida de datos offline.** Un fallo aquí corrompe el inventario o pierde movimientos en almacén. | • Cola offline (`enqueue`, `processQueue`, preservación ante `NetworkError`)<br>• Sincronización (`syncNow`)<br>• Carga de inventario (`GET /api/inventory`) y cache local<br>• Registro de movimientos (`POST /api/movements`: compra, venta, ajuste) | Vitest (TDD + JUnit XML), Cucumber (BDD/ATDD), Postman + Newman, Playwright E2E | **Bloqueante en cada PR y push** |
| **P1 — Alto** | **Operación diaria en almacén y precisión de cifras.** Un fallo aquí impide ubicar productos o muestra costos/cantidades erróneas. | • Filtros de alerta (`Todos`, `Bajo mínimo`, `Agotados`)<br>• Búsqueda por SKU, nombre o código de barras<br>• Formateo `es-PE` (`formatQty`, `formatMoney`, redondeo decimal)<br>• Manejo de errores HTTP (`400`, `422`, `500`) y timeouts | Vitest (TDD + JUnit XML), Cucumber (BDD/ATDD), Postman + Newman, Playwright E2E | **En cada PR y push a `main`** |
| **P2 — Medio/Bajo** | **Experiencia de usuario y casos borde.** Impacto visual o de conveniencia sin riesgo de pérdida de datos. | • Navegación Inicio ↔ Inventario<br>• Estados vacíos (sin productos vs sin coincidencias de filtro)<br>• Formato de fecha de respaldo (`formatSavedAt`) | Vitest (TDD), Playwright E2E | **En `main` / ejecución completa** |

---

## 2. Metodologías: TDD, BDD y ATDD

### TDD (Test-Driven Development) — Pruebas Unitarias
* **Herramienta:** `Vitest` con reporter `junit` (`reports/junit/unit-junit.xml`), equivalente en el ecosistema TypeScript/Expo a JUnit/PyTest.
* **Ubicación:** `mobile/tests/unit/*.test.ts`
* **Ciclo aplicado:** *Red → Green → Refactor* sobre la lógica pura y desacoplada de UI (`format.ts`, `queue.ts`, `storage.ts`, `api.ts`).

### BDD / ATDD (Behavior / Acceptance Test-Driven Development)
* **Herramienta:** `@cucumber/cucumber` con archivos Gherkin en español y reporter `junit` (`reports/junit/bdd-junit.xml`).
* **Ubicación:**
  * Especificaciones de negocio: `mobile/tests/bdd/features/*.feature`
  * Definición de pasos: `mobile/tests/bdd/steps/*.ts`
* **Objetivo:** Validar criterios de aceptación comprensibles por producto y negocio (etiquetados con `@P0`, `@P1`, `@P2`), ejecutables de forma automática.

---

## 3. Herramientas de Automatización

| Capa | Herramienta | Propósito | Salida JUnit / Reporte |
| :--- | :--- | :--- | :--- |
| **Unitaria (TDD)** | Vitest (`junit` reporter) | Lógica de negocio, cola offline, cache y formateo | `mobile/reports/junit/unit-junit.xml` |
| **Aceptación (BDD/ATDD)** | Cucumber (`@cucumber/cucumber`) | Escenarios Gherkin `@P0` / `@P1` de inventario y offline | `mobile/reports/junit/bdd-junit.xml` |
| **API / Contrato** | Postman + Newman | Contrato `GET /api/inventory` y `POST /api/movements` | `mobile/reports/junit/newman-junit.xml` |
| **E2E UI Móvil** | Playwright (`Pixel 5` viewport) | Flujos reales en Expo Web (navegación, filtros, movimientos, offline) | `mobile/reports/junit/playwright-junit.xml` |

> **Nota sobre JUnit/PyTest:** Al ser `mobile` un proyecto TypeScript/Expo (Node.js), **Vitest** cumple el rol de runner unitario TDD (análogo a JUnit en Java o PyTest en Python) y genera reportes estándar **JUnit XML** consumibles por cualquier servidor CI/CD (GitHub Actions, Jenkins, GitLab CI).

---

## 4. Comandos de ejecución local

Desde la carpeta `mobile/`:

```bash
# Verificación de tipos (TypeScript)
npx tsc --noEmit

# 1. Pruebas unitarias TDD (todas) y solo P0
npm run test:unit
npm run test:p0

# 2. Pruebas BDD / ATDD (Cucumber)
npm run test:bdd

# 3. Pruebas de contrato API (Postman + Newman)
#    Requiere backend o servidor mock activo en API_URL (por defecto http://localhost:3002)
npm run test:api
#    O ejecutando el servidor mock incluido automáticamente:
npm run test:api:mock

# 4. Pruebas E2E con Playwright (viewport móvil)
npm run test:e2e
```

---

## 5. Integración Continua (CI/CD)

El pipeline está definido en `.github/workflows/mobile-ci.yml` y se ejecuta automáticamente en cada `push` y `pull_request` que modifique `mobile/**`:

1. **Job `quality-and-tdd-bdd` (Gate rápido P0/P1):**
   * Instala dependencias (`npm ci --legacy-peer-deps`).
   * Ejecuta `npx tsc --noEmit`.
   * Ejecuta pruebas unitarias TDD (`npm run test:unit`) y BDD/ATDD (`npm run test:bdd`).
   * Sube reportes JUnit XML como artefactos.
2. **Job `api-contract-newman` (P0/P1):**
   * Levanta el servidor mock de contrato (`tests/postman/mock-server.mjs`) y ejecuta `newman run` sobre la colección Postman.
   * Sube `newman-junit.xml`.
3. **Job `e2e-playwright` (P0/P1):**
   * Exporta/sirve la app Expo Web, instala Chromium de Playwright y ejecuta `npm run test:e2e`.
   * Sube `playwright-junit.xml` y el reporte HTML de Playwright.
