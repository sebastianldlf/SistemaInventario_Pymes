import * as React from "react";
import NetInfo from "@react-native-community/netinfo";

/**
 * Estado de conexión según NetInfo. Llama a `onReconnect` cuando pasa de desconectado a conectado.
 * Se usa `isConnected` (hay red) y no `isInternetReachable`: el backend suele estar en la LAN,
 * que puede no tener salida a Internet.
 */
export function useConnectivity(onReconnect?: () => void): boolean | null {
  const [connected, setConnected] = React.useState<boolean | null>(null);
  const previous = React.useRef<boolean | null>(null);
  const callback = React.useRef(onReconnect);
  callback.current = onReconnect;

  React.useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        const now = state.isConnected;
        if (previous.current === false && now === true) callback.current?.();
        previous.current = now;
        setConnected(now);
      }),
    [],
  );

  return connected;
}
