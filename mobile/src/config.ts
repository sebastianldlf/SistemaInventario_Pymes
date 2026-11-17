import { NativeModules } from "react-native";
import Constants from "expo-constants";

// Única fuente de configuración. Expo inlinea las variables EXPO_PUBLIC_* de mobile/.env al compilar.
//
// URL de la API:
// 1. EXPO_PUBLIC_API_URL, si está definida (túnel HTTPS, emulador, otra máquina).
// 2. Si no, la IP de la PC que corre Metro + EXPO_PUBLIC_API_PORT (3002).
//    Así no hay que cambiar la IP al cambiar de red Wi-Fi.
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || "3002";

/** Host (sin puerto) desde el que el teléfono descargó el JS: la PC que corre `expo start`. */
function detectMetroHost(): string | undefined {
  const fromUrl = (url?: string | null) => url?.match(/^[a-z]+:\/\/([^/:?#]+)/i)?.[1];
  const fromHostPort = (hp?: string | null) => hp?.split(":")[0] || undefined;
  const expoGo = Constants.expoGoConfig as { debuggerHost?: string } | null;
  return (
    fromHostPort(Constants.expoConfig?.hostUri) ||
    fromHostPort(expoGo?.debuggerHost) ||
    fromUrl(NativeModules.SourceCode?.scriptURL)
  );
}

const metroHost = detectMetroHost();

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || (metroHost ? `http://${metroHost}:${API_PORT}` : "")
).replace(/\/+$/, "");
export const API_KEY = process.env.EXPO_PUBLIC_API_KEY || undefined;

export const GET_TIMEOUT_MS = 10_000;
export const POST_TIMEOUT_MS = 20_000; // el servidor permite hasta 15 s en la transacción
