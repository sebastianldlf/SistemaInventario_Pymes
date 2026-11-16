// Única fuente de configuración. Expo inlinea las variables EXPO_PUBLIC_* de mobile/.env al compilar.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
export const API_KEY = process.env.EXPO_PUBLIC_API_KEY || undefined;

export const GET_TIMEOUT_MS = 10_000;
export const POST_TIMEOUT_MS = 20_000; // el servidor permite hasta 15 s en la transacción
