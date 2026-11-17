import * as React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatMoney, formatQty } from "../lib/format";
import type { InventoryOverview, InventoryRow } from "../shared/inventory";
import { colors, mono, radius } from "../theme";
import { Badge } from "./Badge";
import { Button } from "./Button";

interface Props {
  row: InventoryRow;
  warehouses: InventoryOverview["warehouses"];
  out: boolean;
  low: boolean;
  onMovement: (productId: string) => void;
}

/** Una fila de la tabla web (InventoryTable.tsx) presentada como tarjeta. */
export const ProductCard = React.memo(function ProductCard({ row: r, warehouses, out, low, onMovement }: Props) {
  // Mismo criterio de color que el punto del badge de la web.
  const accent = out ? colors.red500 : low ? colors.amber500 : colors.emerald500;

  return (
    <View style={styles.card} testID={`card-${r.sku}`}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.sku}>{r.sku}</Text>
          {out ? (
            <Badge testID={`badge-${r.sku}`} variant="danger" label="Agotado" />
          ) : low ? (
            <Badge testID={`badge-${r.sku}`} variant="warn" label="Bajo mínimo" />
          ) : (
            <Badge testID={`badge-${r.sku}`} variant="ok" label="Disponible" />
          )}
        </View>

        <Text style={styles.name}>{r.name}</Text>
        <Text style={styles.barcode}>{r.barcode ?? "Sin código de barras"}</Text>
        <Text style={styles.category}>{r.categoryName}</Text>

        <View style={styles.stockBlock}>
          <View
            style={styles.total}
            testID={`stock-${r.sku}`}
            accessible
            accessibilityLabel={`Stock total: ${formatQty(r.totalStock)} ${r.unitOfMeasure}`}
          >
            <Text style={styles.metricLabel}>Stock total</Text>
            <Text style={styles.totalValue}>
              {formatQty(r.totalStock)}
              <Text style={styles.unit}> {r.unitOfMeasure}</Text>
            </Text>
          </View>
          <View style={styles.warehouses}>
            {warehouses.map((w) => {
              const qty = r.stockByWarehouse[w.id] ?? 0;
              return (
                <View key={w.id} style={styles.wh} testID={`stock-${r.sku}-${w.code}`}>
                  <Text style={styles.whCode}>{w.code}</Text>
                  <Text style={[styles.whQty, qty === 0 && styles.whQtyZero]}>{formatQty(qty)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.metrics}>
          <Metric label="Mínimo" value={formatQty(r.minStock)} muted />
          <Metric label="Costo prom." value={formatMoney(r.averageCost)} />
          <Metric label="Precio" value={formatMoney(r.salePrice)} />
        </View>

        <Button
          testID={`btn-mov-${r.sku}`}
          accessibilityLabel={`Registrar movimiento para ${r.sku}`}
          title="Registrar movimiento"
          variant="outline"
          icon={<Ionicons name="swap-horizontal" size={16} color={colors.foreground} />}
          onPress={() => onMovement(r.id)}
        />
      </View>
    </View>
  );
});

function Metric({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.metric} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, muted && { color: colors.mutedForeground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  accent: { width: 3 },
  body: { flex: 1, padding: 16 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sku: { fontFamily: mono, fontSize: 12, color: colors.mutedForeground },
  name: { marginTop: 8, fontSize: 16, fontWeight: "600", letterSpacing: -0.2, color: colors.foreground },
  barcode: { marginTop: 2, fontFamily: mono, fontSize: 11, color: "rgba(113,113,122,0.7)" },
  category: { marginTop: 6, fontSize: 13, color: colors.mutedForeground },
  stockBlock: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.zinc50,
    borderWidth: 1,
    borderColor: colors.border,
  },
  total: { flexShrink: 1 },
  totalValue: { marginTop: 2, fontSize: 24, fontWeight: "600", letterSpacing: -0.4, color: colors.foreground, fontVariant: ["tabular-nums"] },
  unit: { fontSize: 12, fontWeight: "400", letterSpacing: 0, color: colors.mutedForeground },
  warehouses: { gap: 6, alignItems: "stretch", minWidth: 110 },
  wh: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  whCode: { fontSize: 12, fontWeight: "500", color: colors.mutedForeground },
  whQty: { fontSize: 13, fontWeight: "500", color: colors.foreground, fontVariant: ["tabular-nums"] },
  whQtyZero: { fontWeight: "400", color: "rgba(113,113,122,0.4)" },
  metrics: { flexDirection: "row", marginVertical: 14 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 12, color: colors.mutedForeground },
  metricValue: { marginTop: 2, fontSize: 14, color: colors.foreground, fontVariant: ["tabular-nums"] },
});
