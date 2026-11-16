import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

// Equivalente a components/ui/badge.tsx de la web: punto de color + texto.
const dot = {
  neutral: colors.zinc400,
  ok: colors.emerald500,
  warn: colors.amber500,
  danger: colors.red500,
} as const;

export type BadgeVariant = keyof typeof dot;

export function Badge({ variant = "neutral", label, testID }: { variant?: BadgeVariant; label: string; testID?: string }) {
  return (
    <View style={styles.row} testID={testID} accessible accessibilityLabel={label}>
      <View style={[styles.dot, { backgroundColor: dot[variant] }]} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 13, color: "rgba(24,24,27,0.8)" },
});
