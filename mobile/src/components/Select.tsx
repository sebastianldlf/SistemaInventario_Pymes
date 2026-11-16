import * as React from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, TOUCH } from "../theme";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  testID: string;
  accessibilityLabel: string;
  disabled?: boolean;
  textStyle?: TextStyle;
}

/** Sustituto del <select> nativo de la web: botón + Modal con la lista de opciones. */
export function Select({ value, options, onChange, testID, accessibilityLabel, disabled, textStyle }: Props) {
  const [open, setOpen] = React.useState(false);
  const insets = useSafeAreaInsets();
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: selected?.label ?? "" }}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.field, disabled && styles.disabled]}
      >
        <Text numberOfLines={1} style={[styles.value, textStyle]}>
          {selected?.label ?? ""}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Cerrar" testID={`${testID}-cerrar`} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]} testID={`${testID}-opciones`}>
          <Text style={styles.title}>{accessibilityLabel}</Text>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value || "__empty"}
            renderItem={({ item, index }) => {
              const active = item.value === value;
              return (
                <Pressable
                  testID={`${testID}-opt-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.option, (active || pressed) && { backgroundColor: colors.zinc100 }]}
                >
                  <Text style={[styles.optionText, textStyle]} numberOfLines={2}>
                    {item.label}
                  </Text>
                  {active && <Ionicons name="checkmark" size={18} color={colors.foreground} />}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: TOUCH,
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  disabled: { backgroundColor: colors.muted, opacity: 0.6 },
  value: { flex: 1, fontSize: 14, color: colors.foreground },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    maxHeight: "70%",
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: 12,
  },
  title: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, paddingHorizontal: 20, paddingBottom: 8 },
  option: { minHeight: TOUCH, paddingHorizontal: 20, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  optionText: { flex: 1, fontSize: 15, color: colors.foreground },
});
