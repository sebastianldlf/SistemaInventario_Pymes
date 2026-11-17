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
    fieldErrors[k]?.[0] ? <p className="mt-1.5 text-xs text-destructive">{fieldErrors[k]![0]}</p> : null;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="pr-8">
        <DialogTitle className="text-base font-semibold tracking-tight">Registrar movimiento</DialogTitle>
        <DialogDescription className="mt-1 text-[13px] text-muted-foreground">
          Genera una fila inmutable en el Kardex y actualiza el costo promedio.
        </DialogDescription>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Tipo de movimiento">
        {MOVEMENT_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={movementType === t}
            onClick={() => setMovementType(t)}
            className={
              "h-8 rounded-md text-[13px] font-medium transition-colors " +
              (movementType === t
                ? "bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                : "text-muted-foreground hover:text-foreground")
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

      <div className="grid grid-cols-2 gap-4">
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

      <div className="grid grid-cols-2 gap-4">
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
            className="text-right tabular-nums"
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
            className="text-right tabular-nums"
          />
          {err("unitCost")}
        </div>
      </div>

      <dl className="grid grid-cols-2 divide-x rounded-lg border text-[13px]">
        <div className="px-3.5 py-2.5">
          <dt className="text-xs text-muted-foreground">Disponible en almacén</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            {formatQty(available)} <span className="text-xs font-normal text-muted-foreground">{product?.unitOfMeasure}</span>
          </dd>
        </div>
        <div className="px-3.5 py-2.5">
          <dt className="text-xs text-muted-foreground">Costo promedio</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{formatMoney(product?.averageCost ?? 0)}</dd>
        </div>
      </dl>

      <div>
        <Label htmlFor="mv-note">Referencia</Label>
        <Input id="mv-note" name="referenceNote" maxLength={240} placeholder="Factura, guía, motivo…" />
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="-mx-6 flex justify-end gap-2 border-t px-6 pt-4">
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
