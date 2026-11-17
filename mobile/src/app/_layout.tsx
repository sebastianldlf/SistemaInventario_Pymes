import * as React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { refreshPending, syncNow } from "../offline/sync";
import { useConnectivity } from "../offline/useConnectivity";

export default function RootLayout() {
  // Sincroniza la cola al abrir la app y cada vez que vuelve la conexión.
  useConnectivity(syncNow);
  React.useEffect(() => {
    refreshPending().then(syncNow);
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
