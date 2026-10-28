"use client";

import * as React from "react";
import { PackageSearch, Plus, Search, ArrowLeftRight } from "lucide-react";
import type { InventoryOverview } from "@/app/actions/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { MovementModal } from "@/components/inventory/MovementModal";
import { formatMoney, formatQty } from "@/lib/utils";

const th = "sticky top-0 z-10 h-8 border-b bg-muted px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground";
const td = "h-8 border-b px-3";

export function InventoryTable({ overview }: { overview: InventoryOverview }) {
  const { rows, categories, warehouses } = overview;
  const [query, setQuery] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [modal, setModal] = React.useState<{ open: boolean; productId?: string }>({ open: false });

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!categoryId || r.categoryId === categoryId) &&
        (!q || r.sku.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.barcode?.includes(q)),
    );
  }, [rows, query, categoryId]);

  const reorderCount = filtered.filter((r) => r.status === "REORDER").length;
  const totalValue = filtered.reduce((a, r) => a + r.totalStock * r.averageCost, 0);

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label="Tabla de inventario">
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar SKU, código de barras o nombre…"
            aria-label="Buscar productos"
            className="pl-8"
          />
        </div>
        <Select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="Filtrar por categoría"
          className="w-44"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <div className="ml-auto flex items-center gap-3 font-mono text-xs text-muted-foreground">
          <span>{filtered.length} ítems</span>
          <span>{reorderCount} en reorden</span>
          <span>Valor: {formatMoney(totalValue)}</span>
        </div>
        <Button onClick={() => setModal({ open: true })} disabled={rows.length === 0 || warehouses.length === 0}>
          <Plus className="h-4 w-4" /> Movimiento
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr>
              <th className={`${th} text-left`}>SKU</th>
              <th className={`${th} text-left`}>Producto</th>
              <th className={`${th} text-left`}>Categoría</th>
              {warehouses.map((w) => (
                <th key={w.id} className={`${th} text-right`} title={w.name}>
                  {w.code}
                </th>
              ))}
              <th className={`${th} text-right`}>Stock</th>
              <th className={`${th} text-right`}>Mín.</th>
              <th className={`${th} text-right`}>Costo prom.</th>
              <th className={`${th} text-right`}>Precio</th>
              <th className={`${th} text-left`}>Estado</th>
              <th className={`${th} w-10`} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="group hover:bg-muted/60">
                <td className={`${td} font-mono text-xs`}>{r.sku}</td>
                <td className={td}>
                  <div className="max-w-[320px] truncate">{r.name}</div>
                  {r.barcode && <div className="font-mono text-[11px] text-muted-foreground">{r.barcode}</div>}
                </td>
                <td className={`${td} text-muted-foreground`}>{r.categoryName}</td>
                {warehouses.map((w) => (
                  <td key={w.id} className={`${td} text-right font-mono tabular-nums text-muted-foreground`}>
                    {formatQty(r.stockByWarehouse[w.id] ?? 0)}
                  </td>
                ))}
                <td className={`${td} text-right font-mono tabular-nums font-medium`}>
                  {formatQty(r.totalStock)} <span className="text-[11px] font-normal text-muted-foreground">{r.unitOfMeasure}</span>
                </td>
                <td className={`${td} text-right font-mono tabular-nums text-muted-foreground`}>{formatQty(r.minStock)}</td>
                <td className={`${td} text-right font-mono tabular-nums`}>{formatMoney(r.averageCost)}</td>
                <td className={`${td} text-right font-mono tabular-nums`}>{formatMoney(r.salePrice)}</td>
                <td className={td}>
                  {r.status === "REORDER" ? (
                    <Badge variant={r.totalStock <= 0 ? "danger" : "warn"}>{r.totalStock <= 0 ? "Agotado" : "Reorden"}</Badge>
                  ) : (
                    <Badge variant="ok">Normal</Badge>
                  )}
                </td>
                <td className={`${td} text-right`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Registrar movimiento para ${r.sku}`}
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
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
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <PackageSearch className="h-6 w-6" />
            <p>Sin resultados para los filtros actuales.</p>
          </div>
        )}
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
