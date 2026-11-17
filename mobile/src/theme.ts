import { Platform } from "react-native";

// Tokens de backend/src/app/globals.css (HSL → hex) y colores Tailwind usados por la web.
export const colors = {
  background: "#ffffff", // 0 0% 100%
  foreground: "#18181b", // 240 6% 10%
  muted: "#f6f6f7", // 240 5% 96.5%
  mutedForeground: "#71717a", // 240 4% 46%
  border: "#e9e9ec", // 240 6% 92%
  input: "#dfdfe2", // 240 6% 88%
  primary: "#18181b",
  primaryForeground: "#fafafa", // 0 0% 98%
  destructive: "#c52020", // 0 72% 45%
  zinc50: "#fafafa",
  zinc100: "#f4f4f5",
  zinc400: "#a1a1aa",
  zinc950: "#09090b",
  emerald500: "#10b981",
  emerald700: "#047857",
  amber500: "#f59e0b",
  red50: "#fef2f2",
  red500: "#ef4444",
  red600: "#dc2626",
  red700: "#b91c1c",
};

export const mono = Platform.select({ ios: "Menlo", default: "monospace" });

export const radius = { sm: 4, md: 6, lg: 8, xl: 12 };

/** Altura mínima de un target táctil. */
export const TOUCH = 44;
