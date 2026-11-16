import * as React from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { API_URL } from "../config";
import { Button } from "../components/Button";
import { Logo } from "../components/Logo";
import { MovementSheet } from "../components/MovementSheet";
import { ProductCard } from "../components/ProductCard";
import { Select } from "../components/Select";
import { useInventory } from "../hooks/useInventory";
import { formatSavedAt } from "../offline/storage";
import { syncNow, useOfflineState } from "../offline/sync";
import { formatMoney, formatQty } from "../lib/format";
import type { InventoryRow } from "../shared/inventory";
import { colors, radius, TOUCH } from "../theme";

// Reglas copiadas de backend/src/components/inventory/InventoryTable.tsx
type StatusFilter = "ALL" | "LOW" | "OUT";

const STATUS_FILTERS: { value: StatusFilter; label: string; testID: string }[] = [
  { value: "ALL", label: "Todos", testID: "chip-todos" },
  { value: "LOW", label: "Bajo mínimo", testID: "chip-bajo-minimo" },
  { value: "OUT", label: "Agotados", testID: "chip-agotados" },
];

const isOut = (r: InventoryRow) => r.totalStock <= 0;
const isLow = (r: InventoryRow) => r.status === "REORDER" && !isOut(r);
const stockValue = (list: InventoryRow[]) => list.reduce((a, r) => a + r.totalStock * r.averageCost, 0);

export default function InventoryScreen() {
  const { data, cachedAt, error, loading, refreshing, reload } = useInventory();
  const { pending, syncing } = useOfflineState();
  const [query, setQuery] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("ALL");
  const [modal, setModal] = React.useState<{ open: boolean; openId: number; productId?: string }>({ open: false, openId: 0 });

  const rows = data?.rows ?? [];
  const categories = data?.categories ?? [];
  const warehouses = data?.warehouses ?? [];

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

  const openMovement = React.useCallback(
    (productId?: string) => setModal((m) => ({ open: true, openId: m.openId + 1, productId })),
    [],
  );

  const stats = [
    { label: "Productos", value: formatQty(rows.length), hint: `${categories.length} categorías`, testID: "stat-productos" },
    { label: "Bajo mínimo", value: formatQty(lowCount), hint: "Stock en o bajo el mínimo", tone: lowCount > 0 ? colors.amber500 : undefined, testID: "stat-bajo-minimo" },
    { label: "Agotados", value: formatQty(outCount), hint: "Sin existencias", tone: outCount > 0 ? colors.red500 : undefined, testID: "stat-agotados" },
    { label: "Valor del inventario", value: formatMoney(stockValue(rows)), hint: "A costo promedio", testID: "stat-valor" },
  ];

  const nav = (
    <View style={styles.nav}>
      <View style={styles.navLeft}>
        <Logo />
        <Text style={styles.navSlash}>/</Text>
        <Text style={styles.navCurrent}>Inventario</Text>
      </View>
      <Pressable testID="link-inicio" accessibilityRole="link" accessibilityLabel="Inicio" onPress={() => router.navigate("/")} style={styles.navLink}>
        <Text style={styles.navLinkText}>Inicio</Text>
      </Pressable>
    </View>
  );

  const offlineBars = (
    <>
      {cachedAt && (
        <View style={styles.offlineBanner} testID="banner-offline" accessibilityRole="alert">
          <Ionicons name="cloud-offline-outline" size={16} color={colors.foreground} />
          <Text style={styles.offlineText}>Sin conexión · datos del {formatSavedAt(cachedAt)}</Text>
        </View>
      )}
      {pending > 0 && (
        <View style={styles.pendingBar}>
          <Text style={styles.pendingText} testID="badge-pendientes" accessibilityLabel={`${pending} pendientes`}>
            {pending} pendientes
          </Text>
          <Button
            testID="btn-sincronizar"
            title="Sincronizar ahora"
            variant="outline"
            loading={syncing}
            disabled={syncing}
            onPress={() => syncNow()}
          />
        </View>
      )}
    </>
  );

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        {nav}
        <View style={styles.center} testID="loading">
          <ActivityIndicator color={colors.foreground} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        {nav}
        {offlineBars}
        <View style={styles.center} testID="error-red">
          <Text style={styles.emptyTitle}>{error}</Text>
          <Text style={styles.emptyText}>{API_URL || "EXPO_PUBLIC_API_URL no está configurada"}</Text>
          <Button testID="btn-reintentar" title="Reintentar" variant="outline" onPress={() => reload("initial")} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  const header = (
    <View>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1} accessibilityRole="header">
            Inventario
          </Text>
          <Text style={styles.subtitle} testID="subtitulo">
            {rows.length} productos en {warehouses.length} {warehouses.length === 1 ? "almacén" : "almacenes"}
          </Text>
        </View>
        <Button
          testID="btn-movimiento"
          title="Movimiento"
          icon={<Ionicons name="add" size={16} color={colors.primaryForeground} />}
          onPress={() => openMovement()}
          disabled={rows.length === 0 || warehouses.length === 0}
        />
      </View>

      <View style={styles.stats}>
        {stats.map((s, i) => (
          <View
            key={s.label}
            testID={s.testID}
            accessible
            accessibilityLabel={`${s.label}: ${s.value}. ${s.hint}`}
            style={[styles.stat, i % 2 === 1 && styles.statLeft, i >= 2 && styles.statTop]}
          >
            <View style={styles.statLabelRow}>
              {s.tone && <View style={[styles.dot, { backgroundColor: s.tone }]} />}
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
            <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>
              {s.value}
            </Text>
            <Text style={styles.statHint}>{s.hint}</Text>
          </View>
        ))}
      </View>

      <View style={styles.filters}>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={colors.mutedForeground} style={styles.searchIcon} />
          <TextInput
            testID="search"
            accessibilityLabel="Buscar productos"
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por SKU, código o nombre"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />
        </View>
        <Select
          testID="filter-categoria"
          accessibilityLabel="Filtrar por categoría"
          value={categoryId}
          onChange={setCategoryId}
          options={[{ value: "", label: "Todas las categorías" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <View style={styles.chipsRow}>
          <View style={styles.chips} testID="filter-estado" accessibilityLabel="Filtrar por estado">
            {STATUS_FILTERS.map((f) => {
              const active = status === f.value;
              return (
                <Pressable
                  key={f.value}
                  testID={f.testID}
                  accessibilityRole="button"
                  accessibilityLabel={f.label}
                  accessibilityState={{ selected: active }}
                  onPress={() => setStatus(f.value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && { color: colors.foreground }]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {hasFilters && (
            <Pressable
              testID="btn-limpiar"
              accessibilityRole="button"
              accessibilityLabel="Limpiar"
              onPress={() => {
                setQuery("");
                setCategoryId("");
                setStatus("ALL");
              }}
              style={styles.clear}
            >
              <Text style={styles.clearText}>Limpiar</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      {nav}
      {offlineBars}
      <FlatList
        testID="lista-productos"
        data={filtered}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <ProductCard row={item} warehouses={warehouses} out={isOut(item)} low={isLow(item)} onMovement={openMovement} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <View style={styles.empty} testID="sin-resultados">
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptyText}>Ajusta la búsqueda o los filtros.</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload("refresh")} />}
      />
      <View style={styles.footer}>
        <Text style={styles.footerText} testID="pie-mostrando">
          Mostrando {filtered.length} de {rows.length} productos
        </Text>
        <Text style={styles.footerText} testID="pie-valor">
          Valor: <Text style={styles.footerValue}>{formatMoney(stockValue(filtered))}</Text>
        </Text>
      </View>

      <MovementSheet
        open={modal.open}
        openId={modal.openId}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onSaved={() => reload("silent")}
        products={rows}
        warehouses={warehouses}
        defaultProductId={modal.productId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.zinc50 },
  nav: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  navLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  navSlash: { color: colors.border, fontSize: 14 },
  navCurrent: { fontSize: 14, color: colors.mutedForeground },
  navLink: { minHeight: TOUCH, minWidth: TOUCH, justifyContent: "center", alignItems: "flex-end" },
  navLinkText: { fontSize: 14, color: colors.mutedForeground },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.zinc100,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  offlineText: { fontSize: 13, color: colors.foreground },
  pendingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pendingText: { fontSize: 13, fontWeight: "500", color: colors.foreground },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  list: { padding: 16, paddingBottom: 24 },
  titleRow: { flexDirection: "row", alignItems: "flex-end", gap: 12, marginTop: 8 },
  h1: { fontSize: 24, fontWeight: "600", letterSpacing: -0.4, color: colors.foreground },
  subtitle: { marginTop: 4, fontSize: 14, color: colors.mutedForeground },
  stats: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  stat: { width: "50%", paddingHorizontal: 16, paddingVertical: 14 },
  statLeft: { borderLeftWidth: 1, borderLeftColor: colors.border },
  statTop: { borderTopWidth: 1, borderTopColor: colors.border },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statLabel: { fontSize: 13, color: colors.mutedForeground },
  statValue: { marginTop: 8, fontSize: 24, fontWeight: "600", letterSpacing: -0.4, color: colors.foreground, fontVariant: ["tabular-nums"] },
  statHint: { marginTop: 6, fontSize: 12, color: "rgba(113,113,122,0.8)" },
  filters: { gap: 10, paddingVertical: 20 },
  search: { justifyContent: "center" },
  searchIcon: { position: "absolute", left: 12, zIndex: 1 },
  searchInput: {
    minHeight: TOUCH,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    paddingLeft: 36,
    paddingRight: 12,
    fontSize: 14,
    color: colors.foreground,
  },
  chipsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  chips: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    padding: 3,
  },
  chip: { minHeight: TOUCH - 6, paddingHorizontal: 12, borderRadius: 5, justifyContent: "center" },
  chipActive: { backgroundColor: colors.zinc100 },
  chipText: { fontSize: 13, fontWeight: "500", color: colors.mutedForeground },
  clear: { minHeight: TOUCH, paddingHorizontal: 8, justifyContent: "center" },
  clearText: { fontSize: 13, color: colors.mutedForeground, textDecorationLine: "underline" },
  empty: { paddingVertical: 64, alignItems: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "500", color: colors.foreground, textAlign: "center" },
  emptyText: { marginTop: 4, fontSize: 13, color: colors.mutedForeground, textAlign: "center" },
  footer: {
    minHeight: 44,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  footerText: { fontSize: 12, color: colors.mutedForeground },
  footerValue: { fontWeight: "500", color: colors.foreground, fontVariant: ["tabular-nums"] },
});
