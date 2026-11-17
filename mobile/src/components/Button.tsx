import * as React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, TOUCH } from "../theme";

type Variant = "default" | "outline" | "ghost";

interface Props extends Omit<PressableProps, "style" | "children"> {
  title: string;
  variant?: Variant;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Equivalente a components/ui/button.tsx de la web (variantes default / outline / ghost). */
export function Button({ title, variant = "default", loading, icon, disabled, style, ...props }: Props) {
  const fg = variant === "default" ? colors.primaryForeground : colors.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === "default" && styles.default,
        variant === "outline" && styles.outline,
        pressed && { opacity: 0.85 },
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator size="small" color={fg} /> : icon}
        <Text style={[styles.text, { color: fg }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: TOUCH, paddingHorizontal: 14, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  default: { backgroundColor: colors.primary },
  outline: { borderWidth: 1, borderColor: colors.input, backgroundColor: colors.background },
  disabled: { opacity: 0.4 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  text: { fontSize: 14, fontWeight: "500" },
});
