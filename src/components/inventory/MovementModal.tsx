"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { registerStockMovement } from "@/app/actions/inventory";
import type { InventoryRow } from "@/app/actions/inventory";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { MOVEMENT_LABELS, MOVEMENT_TYPES, type MovementType } from "@/lib/zod-schemas";
import { formatMoney, formatQty } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: InventoryRow[];
  warehouses: { id: string; code: string; name: string }[];
  defaultProductId?: string;
}

export function MovementModal({ open, onOpenChange, products, warehouses, defaultProductId }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <MovementForm
          key={`${open}-${defaultProductId ?? ""}`}
          products={products}
          warehouses={warehouses}
          defaultProductId={defaultProductId}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function MovementForm({
  products,
  warehouses,
  defaultProductId,
  onDone,
}: Omit<Props, "open" | "onOpenChange"> & { onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[] | undefined>>({});

  const [productId, setProductId] = React.useState(defaultProductId ?? products[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = React.useState(warehouses[0]?.id ?? "");
  const [movementType, setMovementType] = React.useState<MovementType>("PURCHASE_RECEIPT");
  const [direction, setDirection] = React.useState<"IN" | "OUT">("IN");

  const product = products.find((p) => p.id === productId);
  const available = product?.stockByWarehouse[warehouseId] ?? 0;
  const needsCost = movementType === "PURCHASE_RECEIPT" || (movementType === "ADJUSTMENT" && direction === "IN");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const unitCost = String(fd.get("unitCost") ?? "").trim();
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const res = await registerStockMovement({
        productId,
        warehouseId,
        movementType,
        direction: movementType === "ADJUSTMENT" ? direction : undefined,
        quantity: String(fd.get("quantity") ?? ""),
        unitCost: needsCost && unitCost !== "" ? unitCost : undefined,
        referenceNote: String(fd.get("referenceNote") ?? ""),
      });
      if (!res.ok) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }
      router.refresh();
      onDone();
    });
  }

  const err = (k: string) =>
    fieldErrors[k]?.[0] ? <p className="mt-1 text-xs text-destructive">{fieldErrors[k]![0]}</p> : null;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <DialogTitle className="text-sm font-semibold">Registrar movimiento</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Genera una fila inmutable en el Kardex y actualiza el costo promedio.
        </DialogDescription>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-md border p-0.5" role="tablist" aria-label="Tipo de movimiento">
        {MOVEMENT_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={movementType === t}
            onClick={() => setMovementType(t)}
            className={
              "h-7 rounded-sm text-xs font-medium transition-colors " +
              (movementType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")
            }
          >
            {MOVEMENT_LABELS[t]}
          </button>
        ))}
      </div>

      <div>
        <Label htmlFor="mv-product">Producto</Label>
        <Select id="mv-product" value={productId} onChange={(e) => setProductId(e.target.value)} className="font-mono">
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} — {p.name}
            </option>
          ))}
        </Select>
        {err("productId")}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="mv-wh">Almacén</Label>
          <Select id="mv-wh" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} · {w.name}
              </option>
            ))}
          </Select>
          {err("warehouseId")}
        </div>
        {movementType === "ADJUSTMENT" && (
          <div>
            <Label htmlFor="mv-dir">Sentido</Label>
            <Select id="mv-dir" value={direction} onChange={(e) => setDirection(e.target.value as "IN" | "OUT")}>
              <option value="IN">Aumenta (+)</option>
              <option value="OUT">Disminuye (−)</option>
            </Select>
            {err("direction")}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="mv-qty">
            Cantidad {product ? `(${product.unitOfMeasure})` : ""}
          </Label>
          <Input
            id="mv-qty"
            name="quantity"
            inputMode="decimal"
            autoFocus
            required
            placeholder="0"
            className="text-right font-mono tabular-nums"
          />
          {err("quantity")}
        </div>
        <div>
          <Label htmlFor="mv-cost">Costo unitario</Label>
          <Input
            id="mv-cost"
            name="unitCost"
            inputMode="decimal"
            disabled={!needsCost}
            placeholder={needsCost ? formatMoney(product?.averageCost ?? 0) : "CPP vigente"}
            className="text-right font-mono tabular-nums"
          />
          {err("unitCost")}
        </div>
      </div>

      <p className="font-mono text-xs text-muted-foreground">
        Disponible en almacén: {formatQty(available)} {product?.unitOfMeasure} · CPP:{" "}
        {formatMoney(product?.averageCost ?? 0)}
      </p>

      <div>
        <Label htmlFor="mv-note">Referencia</Label>
        <Input id="mv-note" name="referenceNote" maxLength={240} placeholder="Factura, guía, motivo…" />
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-red-600/30 bg-red-50 px-2.5 py-1.5 text-xs text-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !productId || !warehouseId}>
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Registrar
        </Button>
      </div>
    </form>
  );
}
