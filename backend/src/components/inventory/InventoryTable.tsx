"use client";

import * as React from "react";
import { ArrowLeftRight, Plus, Search } from "lucide-react";
import type { InventoryOverview, InventoryRow } from "@/app/actions/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { MovementModal } from "@/components/inventory/MovementModal";
import { cn, formatMoney, formatQty } from "@/lib/utils";

type StatusFilter = "ALL" | "LOW" | "OUT";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "LOW", label: "Bajo mínimo" },
  { value: "OUT", label: "Agotados" },
];

const isOut = (r: InventoryRow) => r.totalStock <= 0;
const isLow = (r: InventoryRow) => r.status === "REORDER" && !isOut(r);
const stockValue = (list: InventoryRow[]) => list.reduce((a, r) => a + r.totalStock * r.averageCost, 0);

const container = "mx-auto w-full max-w-[1440px] px-6 lg:px-10";
const th =
  "sticky top-0 z-10 h-11 border-b bg-zinc-50 px-4 text-left align-middle text-xs font-medium text-muted-foreground first:pl-5 last:pr-5";
const td = "h-[60px] border-b border-border/60 px-4 align-middle first:pl-5 last:pr-5";
const num = "text-right tabular-nums";

export function InventoryTable({ overview }: { overview: InventoryOverview }) {
  const { rows, categories, warehouses } = overview;
  const [query, setQuery] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("ALL");
  const [modal, setModal] = React.useState<{ open: boolean; productId?: string }>({ open: false });

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!categoryId || r.categoryId === categoryId) &&
        (status === "ALL" || (status === "LOW" ? isLow(r) : isOut(r))) &&
        (!q || r.sku.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.barcode?.includes(q)),
    );
  }, [rows, query, categoryId, status]);

  const lowCount = rows.filter(isLow).length;
  const outCount = rows.filter(isOut).length;
  const hasFilters = query !== "" || categoryId !== "" || status !== "ALL";

  const stats = [
    { label: "Productos", value: formatQty(rows.length), hint: `${categories.length} categorías` },
    { label: "Bajo mínimo", value: formatQty(lowCount), hint: "Stock en o bajo el mínimo", tone: lowCount > 0 ? "bg-amber-500" : undefined },
    { label: "Agotados", value: formatQty(outCount), hint: "Sin existencias", tone: outCount > 0 ? "bg-red-500" : undefined },
    { label: "Valor del inventario", value: formatMoney(stockValue(rows)), hint: "A costo promedio" },
  ];

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label="Tabla de inventario">
      <div className={cn(container, "shrink-0 pt-8")}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Inventario</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {rows.length} productos en {warehouses.length} {warehouses.length === 1 ? "almacén" : "almacenes"}
            </p>
          </div>
          <Button onClick={() => setModal({ open: true })} disabled={rows.length === 0 || warehouses.length === 0}>
            <Plus className="h-4 w-4" />
            Movimiento
          </Button>
        </div>

        <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border bg-background lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={cn("px-5 py-4", i % 2 === 1 && "border-l", i >= 2 && "border-t lg:border-t-0", i === 2 && "lg:border-l")}
            >
              <dt className="flex items-center gap-2 text-[13px] text-muted-foreground">
                {s.tone && <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", s.tone)} />}
                {s.label}
              </dt>
              <dd className="mt-2 text-[26px] font-semibold leading-none tracking-tight tabular-nums">{s.value}</dd>
              <dd className="mt-2 text-xs text-muted-foreground/80">{s.hint}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap items-center gap-2.5 py-5">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por SKU, código o nombre"
              aria-label="Buscar productos"
              className="pl-9"
            />
          </div>
          <div className="w-48">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Filtrar por categoría">
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="inline-flex h-9 items-center rounded-md border bg-background p-[3px]" role="group" aria-label="Filtrar por estado">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={status === f.value}
                onClick={() => setStatus(f.value)}
                className={cn(
                  "h-full rounded-[5px] px-3 text-[13px] font-medium transition-colors",
                  status === f.value ? "bg-zinc-100 text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategoryId("");
                setStatus("ALL");
              }}
              className="px-2 text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className={cn(container, "flex min-h-0 flex-1 flex-col pb-6")}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  <th className={th}>SKU</th>
                  <th className={th}>Producto</th>
                  <th className={th}>Categoría</th>
                  {warehouses.map((w) => (
                    <th key={w.id} className={cn(th, "text-right")}>
                      <div>{w.code}</div>
                      <div className="text-[11px] font-normal text-muted-foreground/70">{w.name}</div>
                    </th>
                  ))}
                  <th className={cn(th, "text-right")}>Stock total</th>
                  <th className={cn(th, "text-right")}>Mínimo</th>
                  <th className={cn(th, "text-right")}>Costo prom.</th>
                  <th className={cn(th, "text-right")}>Precio</th>
                  <th className={cn(th, "pl-10")}>Estado</th>
                  <th className={cn(th, "w-14")}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="group transition-colors hover:bg-zinc-50/80">
                    <td className={cn(td, "font-mono text-xs text-muted-foreground")}>{r.sku}</td>
                    <td className={td}>
                      <div className="max-w-[340px] truncate font-medium text-foreground">{r.name}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground/70">{r.barcode ?? "Sin código de barras"}</div>
                    </td>
                    <td className={cn(td, "text-muted-foreground")}>{r.categoryName}</td>
                    {warehouses.map((w) => {
                      const qty = r.stockByWarehouse[w.id] ?? 0;
                      return (
                        <td key={w.id} className={cn(td, num, qty === 0 ? "text-muted-foreground/40" : "text-foreground/80")}>
                          {formatQty(qty)}
                        </td>
                      );
                    })}
                    <td className={cn(td, num)}>
                      <span className="font-semibold">{formatQty(r.totalStock)}</span>
                      <span className="ml-1.5 text-[11px] text-muted-foreground">{r.unitOfMeasure}</span>
                    </td>
                    <td className={cn(td, num, "text-muted-foreground")}>{formatQty(r.minStock)}</td>
                    <td className={cn(td, num)}>{formatMoney(r.averageCost)}</td>
                    <td className={cn(td, num)}>{formatMoney(r.salePrice)}</td>
                    <td className={cn(td, "pl-10")}>
                      {isOut(r) ? (
                        <Badge variant="danger">Agotado</Badge>
                      ) : isLow(r) ? (
                        <Badge variant="warn">Bajo mínimo</Badge>
                      ) : (
                        <Badge variant="ok">Disponible</Badge>
                      )}
                    </td>
                    <td className={cn(td, "text-right")}>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Registrar movimiento"
                        aria-label={`Registrar movimiento para ${r.sku}`}
                        className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={() => setModal({ open: true, productId: r.id })}
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="py-20 text-center">
                <p className="font-medium">Sin resultados</p>
                <p className="mt-1 text-[13px] text-muted-foreground">Ajusta la búsqueda o los filtros.</p>
              </div>
            )}
          </div>

          <div className="flex h-11 shrink-0 items-center justify-between border-t px-5 text-xs text-muted-foreground">
            <span>
              Mostrando {filtered.length} de {rows.length} productos
            </span>
            <span>
              Valor: <span className="font-medium tabular-nums text-foreground">{formatMoney(stockValue(filtered))}</span>
            </span>
          </div>
        </div>
      </div>

      <MovementModal
        open={modal.open}
        onOpenChange={(open) => setModal((m) => ({ ...m, open }))}
        products={rows}
        warehouses={warehouses}
        defaultProductId={modal.productId}
      />
    </section>
  );
}
