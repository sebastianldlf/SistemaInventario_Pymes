import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button } from "../components/Button";
import { Logo } from "../components/Logo";
import { colors } from "../theme";

// Provisional (F2). La landing condensada llega en F4.
export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <Logo />
        <Button testID="btn-abrir-inventario" title="Abrir inventario" onPress={() => router.push("/inventario")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 24 },
});
