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
  return (
    <View style={styles.card} testID={`card-${r.sku}`}>
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

      <View style={styles.warehouses}>
        {warehouses.map((w) => {
          const qty = r.stockByWarehouse[w.id] ?? 0;
          return (
            <View key={w.id} style={styles.wh} testID={`stock-${r.sku}-${w.code}`}>
              <Text style={styles.whCode}>{w.code}</Text>
              <Text style={[styles.whQty, { color: qty === 0 ? "rgba(113,113,122,0.4)" : "rgba(24,24,27,0.8)" }]}>
                {formatQty(qty)}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric} testID={`stock-${r.sku}`} accessible accessibilityLabel={`Stock total: ${formatQty(r.totalStock)} ${r.unitOfMeasure}`}>
          <Text style={styles.metricLabel}>Stock total</Text>
          <Text style={styles.metricValue}>
            <Text style={{ fontWeight: "600" }}>{formatQty(r.totalStock)}</Text>
            <Text style={styles.unit}> {r.unitOfMeasure}</Text>
          </Text>
        </View>
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 16,
    gap: 2,
  },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sku: { fontFamily: mono, fontSize: 12, color: colors.mutedForeground },
  name: { marginTop: 6, fontSize: 15, fontWeight: "500", color: colors.foreground },
  barcode: { fontFamily: mono, fontSize: 11, color: "rgba(113,113,122,0.7)" },
  category: { marginTop: 2, fontSize: 13, color: colors.mutedForeground },
  warehouses: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  wh: {
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.zinc50,
  },
  whCode: { fontSize: 12, fontWeight: "500", color: colors.mutedForeground },
  whQty: { fontSize: 13, fontVariant: ["tabular-nums"] },
  metrics: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, marginBottom: 12, rowGap: 10 },
  metric: { width: "50%" },
  metricLabel: { fontSize: 12, color: colors.mutedForeground },
  metricValue: { marginTop: 2, fontSize: 13, color: colors.foreground, fontVariant: ["tabular-nums"] },
  unit: { fontSize: 11, color: colors.mutedForeground },
});
