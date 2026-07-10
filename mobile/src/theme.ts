import React from "react";
import { useColorScheme } from "react-native";
import { getJson, setJson } from "./storage";

export type ThemeMode = "system" | "light" | "dark";

export type Palette = {
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  muted: string;
  faint: string;
  border: string;
  borderStrong: string;
  inputBg: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  shadow: string;
  overlay: string;
  heroText: string;
  heroMuted: string;
  heroChip: string;
  blurTint: "light" | "dark";
};

export const LIGHT: Palette = {
  bg: "#F3F5FA",
  card: "#FFFFFF",
  cardAlt: "#F8FAFD",
  text: "#0B1220",
  muted: "#5C6675",
  faint: "rgba(11, 18, 32, 0.38)",
  border: "rgba(11, 18, 32, 0.08)",
  borderStrong: "rgba(11, 18, 32, 0.14)",
  inputBg: "rgba(11, 18, 32, 0.03)",
  accent: "#4F46E5",
  accentSoft: "rgba(79, 70, 229, 0.10)",
  onAccent: "#FFFFFF",
  success: "#059669",
  successSoft: "rgba(5, 150, 105, 0.12)",
  danger: "#DC2626",
  dangerSoft: "rgba(220, 38, 38, 0.10)",
  shadow: "rgba(2, 6, 23, 0.10)",
  overlay: "rgba(4, 8, 18, 0.45)",
  heroText: "#FFFFFF",
  heroMuted: "rgba(255, 255, 255, 0.72)",
  heroChip: "rgba(255, 255, 255, 0.16)",
  blurTint: "light"
};

export const DARK: Palette = {
  bg: "#070B14",
  card: "#0F1626",
  cardAlt: "#131B2E",
  text: "#F2F5FB",
  muted: "#939DAF",
  faint: "rgba(242, 245, 251, 0.35)",
  border: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 255, 255, 0.14)",
  inputBg: "rgba(255, 255, 255, 0.05)",
  accent: "#818CF8",
  accentSoft: "rgba(129, 140, 248, 0.14)",
  onAccent: "#0B1220",
  success: "#34D399",
  successSoft: "rgba(52, 211, 153, 0.14)",
  danger: "#F87171",
  dangerSoft: "rgba(248, 113, 113, 0.14)",
  shadow: "rgba(0, 0, 0, 0.45)",
  overlay: "rgba(0, 0, 0, 0.60)",
  heroText: "#FFFFFF",
  heroMuted: "rgba(255, 255, 255, 0.72)",
  heroChip: "rgba(255, 255, 255, 0.14)",
  blurTint: "dark"
};

export const FONTS = {
  display: "SpaceGrotesk_700Bold",
  displaySemi: "SpaceGrotesk_600SemiBold",
  displayMed: "SpaceGrotesk_500Medium",
  bodyBold: "Inter_700Bold",
  bodySemi: "Inter_600SemiBold",
  bodyMed: "Inter_500Medium",
  body: "Inter_400Regular"
} as const;

export const RADIUS = { sm: 12, md: 16, lg: 20, xl: 26, pill: 999 } as const;
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 30 } as const;

/** Rich two-stop gradients keyed by currency, used for the hero card. */
const CURRENCY_GRADIENTS: Record<string, [string, string]> = {
  EUR: ["#312E81", "#6366F1"],
  ALL: ["#115E59", "#2DD4BF"],
  USD: ["#064E3B", "#10B981"],
  GBP: ["#4C1D95", "#8B5CF6"],
  CHF: ["#881337", "#F43F5E"],
  JPY: ["#831843", "#EC4899"],
  TRY: ["#7C2D12", "#F97316"],
  CAD: ["#7F1D1D", "#F87171"],
  AUD: ["#78350F", "#F59E0B"],
  SEK: ["#1E3A8A", "#3B82F6"],
  NOK: ["#0C4A6E", "#0EA5E9"],
  DKK: ["#9F1239", "#FB7185"],
  PLN: ["#9D174D", "#F472B6"],
  CZK: ["#134E4A", "#14B8A6"],
  CNY: ["#7F1D1D", "#DC2626"],
  INR: ["#7C2D12", "#FB923C"],
  BRL: ["#14532D", "#22C55E"],
  MXN: ["#14532D", "#4ADE80"],
  KRW: ["#1E3A8A", "#60A5FA"],
  ZAR: ["#3F6212", "#84CC16"]
};

const GRADIENT_FALLBACKS: [string, string][] = [
  ["#312E81", "#6366F1"],
  ["#0C4A6E", "#0EA5E9"],
  ["#134E4A", "#14B8A6"],
  ["#4C1D95", "#8B5CF6"],
  ["#831843", "#EC4899"],
  ["#78350F", "#F59E0B"]
];

export function gradientFor(code: string): [string, string] {
  const g = CURRENCY_GRADIENTS[code];
  if (g) return g;
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return GRADIENT_FALLBACKS[h % GRADIENT_FALLBACKS.length];
}

/** Brand gradient (also the EUR gradient) used for the wordmark badge and buttons. */
export const BRAND_GRADIENT: [string, string] = ["#4F46E5", "#8B5CF6"];

type ThemeContextValue = {
  palette: Palette;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = React.createContext<ThemeContextValue>({
  palette: LIGHT,
  isDark: false,
  mode: "system",
  setMode: () => {}
});

const MODE_KEY = "theme_mode_v1";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = React.useState<ThemeMode>("system");

  React.useEffect(() => {
    getJson<ThemeMode>(MODE_KEY, "system")
      .then((m) => {
        if (m === "light" || m === "dark" || m === "system") setModeState(m);
      })
      .catch(() => {});
  }, []);

  const setMode = React.useCallback((m: ThemeMode) => {
    setModeState(m);
    setJson(MODE_KEY, m).catch(() => {});
  }, []);

  const isDark = mode === "system" ? system === "dark" : mode === "dark";
  const palette = isDark ? DARK : LIGHT;

  const value = React.useMemo(() => ({ palette, isDark, mode, setMode }), [palette, isDark, mode, setMode]);

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
