import * as React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NetworkError, postMovement } from "../api";
import { formatMoney, formatQty } from "../lib/format";
import { queueMovement } from "../offline/sync";
import {
  MOVEMENT_LABELS,
  MOVEMENT_TYPES,
  type InventoryOverview,
  type InventoryRow,
  type MovementType,
  type StockMovementInput,
} from "../shared/inventory";
import { colors, mono, radius, TOUCH } from "../theme";
import { Button } from "./Button";
import { Select } from "./Select";

const TAB_IDS: Record<MovementType, string> = {
  PURCHASE_RECEIPT: "tab-entrada-compra",
  SALE_DISPATCH: "tab-salida-venta",
  ADJUSTMENT: "tab-ajuste",
};

interface Props {
  open: boolean;
  /** Se incrementa en cada apertura para reiniciar el formulario (equivale al `key` del modal web). */
  openId: number;
  onClose: () => void;
  /** Movimiento aceptado por el servidor. */
  onSaved: () => void;
  products: InventoryRow[];
  warehouses: InventoryOverview["warehouses"];
  defaultProductId?: string;
}

/** Equivalente a components/inventory/MovementModal.tsx de la web, como hoja inferior. */
export function MovementSheet({ open, openId, onClose, onSaved, products, warehouses, defaultProductId }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" testID="mv-backdrop" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
          <View style={styles.handle} />
          {open && (
            <MovementForm
              key={openId}
              products={products}
              warehouses={warehouses}
              defaultProductId={defaultProductId}
              onDone={onClose}
              onSaved={onSaved}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MovementForm({
  products,
  warehouses,
  defaultProductId,
  onDone,
  onSaved,
}: Pick<Props, "products" | "warehouses" | "defaultProductId" | "onSaved"> & { onDone: () => void }) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[] | undefined>>({});

  const [productId, setProductId] = React.useState(defaultProductId ?? products[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = React.useState(warehouses[0]?.id ?? "");
  const [movementType, setMovementType] = React.useState<MovementType>("PURCHASE_RECEIPT");
  const [direction, setDirection] = React.useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = React.useState("");
  const [unitCost, setUnitCost] = React.useState("");
  const [referenceNote, setReferenceNote] = React.useState("");

  const product = products.find((p) => p.id === productId);
  const available = product?.stockByWarehouse[warehouseId] ?? 0;
  const needsCost = movementType === "PURCHASE_RECEIPT" || (movementType === "ADJUSTMENT" && direction === "IN");

  async function onSubmit() {
    const cost = unitCost.trim();
    setError(null);
    setFieldErrors({});
    setPending(true);

    const input: StockMovementInput = {
      productId,
      warehouseId,
      movementType,
      direction: movementType === "ADJUSTMENT" ? direction : undefined,
      quantity,
      unitCost: needsCost && cost !== "" ? cost : undefined,
      referenceNote,
    };

    try {
      const res = await postMovement(input);
      if (res.body?.ok) {
        onSaved();
        onDone();
        return;
      }
      setError(res.body && !res.body.ok ? res.body.error : `Error del servidor (HTTP ${res.status})`);
      setFieldErrors(res.body && !res.body.ok ? (res.body.fieldErrors ?? {}) : {});
    } catch (e) {
      if (e instanceof NetworkError) {
        await queueMovement(input);
        onDone();
        return;
      }
      setError("Error inesperado");
    } finally {
      setPending(false);
    }
  }

  const err = (k: string) =>
    fieldErrors[k]?.[0] ? (
      <Text testID={`error-${k}`} style={styles.fieldError}>
        {fieldErrors[k]![0]}
      </Text>
    ) : null;

  return (
    <View style={styles.flexShrink} testID="form-movimiento">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <View>
          <Text style={styles.title} accessibilityRole="header">
            Registrar movimiento
          </Text>
          <Text style={styles.description}>Genera una fila inmutable en el Kardex y actualiza el costo promedio.</Text>
        </View>

        <View style={styles.tabs} accessibilityRole="tablist" accessibilityLabel="Tipo de movimiento">
          {MOVEMENT_TYPES.map((t) => {
            const active = movementType === t;
            return (
              <Pressable
                key={t}
                testID={TAB_IDS[t]}
                accessibilityRole="tab"
                accessibilityLabel={MOVEMENT_LABELS[t]}
                accessibilityState={{ selected: active }}
                onPress={() => setMovementType(t)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && { color: colors.foreground }]} numberOfLines={2}>
                  {MOVEMENT_LABELS[t]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View>
          <Text style={styles.label}>Producto</Text>
          <Select
            testID="mv-product"
            accessibilityLabel="Producto"
            value={productId}
            onChange={setProductId}
            options={products.map((p) => ({ value: p.id, label: `${p.sku} — ${p.name}` }))}
            textStyle={{ fontFamily: mono, fontSize: 13 }}
          />
          {err("productId")}
        </View>

        <View style={styles.grid2}>
          <View style={styles.col}>
            <Text style={styles.label}>Almacén</Text>
            <Select
              testID="mv-wh"
              accessibilityLabel="Almacén"
              value={warehouseId}
              onChange={setWarehouseId}
              options={warehouses.map((w) => ({ value: w.id, label: `${w.code} · ${w.name}` }))}
            />
            {err("warehouseId")}
          </View>
          {movementType === "ADJUSTMENT" && (
            <View style={styles.col}>
              <Text style={styles.label}>Sentido</Text>
              <Select
                testID="mv-dir"
                accessibilityLabel="Sentido"
                value={direction}
                onChange={(v) => setDirection(v as "IN" | "OUT")}
                options={[
                  { value: "IN", label: "Aumenta (+)" },
                  { value: "OUT", label: "Disminuye (−)" },
                ]}
              />
              {err("direction")}
            </View>
          )}
        </View>

        <View style={styles.grid2}>
          <View style={styles.col}>
            <Text style={styles.label}>Cantidad {product ? `(${product.unitOfMeasure})` : ""}</Text>
            <TextInput
              testID="mv-qty"
              accessibilityLabel="Cantidad"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              autoFocus
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, styles.numeric]}
            />
            {err("quantity")}
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Costo unitario</Text>
            <TextInput
              testID="mv-cost"
              accessibilityLabel="Costo unitario"
              accessibilityState={{ disabled: !needsCost }}
              value={unitCost}
              onChangeText={setUnitCost}
              editable={needsCost}
              keyboardType="decimal-pad"
              placeholder={needsCost ? formatMoney(product?.averageCost ?? 0) : "CPP vigente"}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, styles.numeric, !needsCost && styles.inputDisabled]}
            />
            {err("unitCost")}
          </View>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryCell} testID="mv-disponible" accessible accessibilityLabel={`Disponible en almacén: ${formatQty(available)} ${product?.unitOfMeasure ?? ""}`}>
            <Text style={styles.summaryLabel}>Disponible en almacén</Text>
            <Text style={styles.summaryValue}>
              {formatQty(available)} <Text style={styles.summaryUnit}>{product?.unitOfMeasure}</Text>
            </Text>
          </View>
          <View style={[styles.summaryCell, styles.summaryDivider]} testID="mv-cpp" accessible accessibilityLabel={`Costo promedio: ${formatMoney(product?.averageCost ?? 0)}`}>
            <Text style={styles.summaryLabel}>Costo promedio</Text>
            <Text style={styles.summaryValue}>{formatMoney(product?.averageCost ?? 0)}</Text>
          </View>
        </View>

        <View>
          <Text style={styles.label}>Referencia</Text>
          <TextInput
            testID="mv-note"
            accessibilityLabel="Referencia"
            value={referenceNote}
            onChangeText={setReferenceNote}
            maxLength={240}
            placeholder="Factura, guía, motivo…"
            placeholderTextColor={colors.mutedForeground}
            style={styles.input}
          />
        </View>

        {error && (
          <Text testID="alert-error" accessibilityRole="alert" style={styles.alert}>
            {error}
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button testID="btn-cancelar" title="Cancelar" variant="outline" onPress={onDone} disabled={pending} />
        <Button
          testID="btn-registrar"
          title="Registrar"
          onPress={onSubmit}
          loading={pending}
          disabled={pending || !productId || !warehouseId}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    maxHeight: "92%",
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, marginTop: 8, backgroundColor: colors.input },
  body: { padding: 20, gap: 18 },
  title: { fontSize: 16, fontWeight: "600", letterSpacing: -0.2, color: colors.foreground },
  description: { marginTop: 4, fontSize: 13, color: colors.mutedForeground },
  tabs: { flexDirection: "row", gap: 4, backgroundColor: colors.muted, borderRadius: radius.lg, padding: 4 },
  tab: { flex: 1, minHeight: TOUCH, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  tabActive: {
    backgroundColor: colors.background,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tabText: { fontSize: 13, fontWeight: "500", color: colors.mutedForeground, textAlign: "center" },
  label: { marginBottom: 6, fontSize: 13, fontWeight: "500", color: "rgba(24,24,27,0.8)" },
  grid2: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  input: {
    minHeight: TOUCH,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.foreground,
  },
  numeric: { textAlign: "right", fontVariant: ["tabular-nums"] },
  inputDisabled: { backgroundColor: colors.muted, opacity: 0.6 },
  fieldError: { marginTop: 6, fontSize: 12, color: colors.destructive },
  summary: { flexDirection: "row", borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.zinc50 },
  summaryCell: { flex: 1, paddingHorizontal: 14, paddingVertical: 10 },
  summaryDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  summaryLabel: { fontSize: 12, color: colors.mutedForeground },
  summaryValue: { marginTop: 2, fontSize: 13, fontWeight: "500", color: colors.foreground, fontVariant: ["tabular-nums"] },
  summaryUnit: { fontSize: 12, fontWeight: "400", color: colors.mutedForeground },
  alert: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.2)",
    backgroundColor: colors.red50,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 18,
    color: colors.red700,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
});
