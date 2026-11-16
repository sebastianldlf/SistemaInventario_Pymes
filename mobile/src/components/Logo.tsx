import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

/** LogoMark de la web (backend/src/components/brand/Logo.tsx), dibujado con Views en una caja de 20×20. */
export function LogoMark({ size = 20, color = colors.foreground }: { size?: number; color?: string }) {
  const k = size / 20;
  const rect = (x: number, y: number, w: number, h: number, r: number, opacity = 1) => ({
    position: "absolute" as const,
    left: x * k,
    top: y * k,
    width: w * k,
    height: h * k,
    borderRadius: r * k,
    backgroundColor: color,
    opacity,
  });
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={rect(2, 3.5, 16, 3.5, 1)} />
      <View style={rect(2, 8.5, 16, 3.5, 1, 0.5)} />
      <View style={rect(2, 13.5, 4, 3, 0.75)} />
      <View style={rect(8, 13.5, 4, 3, 0.75)} />
      <View style={rect(14, 13.5, 4, 3, 0.75)} />
    </View>
  );
}

export function Logo() {
  return (
    <View style={styles.row} accessible accessibilityLabel="Tarima">
      <LogoMark />
      <Text style={styles.text}>Tarima</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  text: { fontSize: 15, fontWeight: "600", letterSpacing: -0.2, color: colors.foreground },
});
