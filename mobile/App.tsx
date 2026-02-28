import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import mobileAds, { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import { Ionicons } from "@expo/vector-icons";

import { convert, listCurrencies, loadFx, refreshFxNow } from "./src/fx";
import { CurrencyPicker } from "./src/CurrencyPicker";
import { CURRENCY_NAMES } from "./src/currencies";
import { t, type Lang } from "./src/i18n";
import { formatMoney, formatRateLine } from "./src/format";
import ChecklistScreen from "./src/screens/ChecklistScreen";
import SplitScreen from "./src/screens/SplitScreen";
import * as Clipboard from "expo-clipboard";

const QUICK = ["EUR", "ALL", "USD", "GBP"];
type Tab = "convert" | "checklist" | "split";

const UI = {
  bg: "#F6F7FB",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "rgba(15, 23, 42, 0.08)",
  shadow: "rgba(2, 6, 23, 0.08)",
  accent: "#2563EB",
  accentSoft: "rgba(37, 99, 235, 0.12)",
  dark: "#0B1220"
};

export default function App() {
  const insets = useSafeAreaInsets();

  const [tab, setTab] = React.useState<Tab>("convert");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [fx, setFx] = React.useState<any>(null);
  const [fromCache, setFromCache] = React.useState(false);

  const [refreshing, setRefreshing] = React.useState(false);
  const [lastRefreshMsg, setLastRefreshMsg] = React.useState<string>("");

  const [lang, setLang] = React.useState<Lang>("en");

  const [from, setFrom] = React.useState("EUR");
  const [to, setTo] = React.useState("ALL");
  const [amount, setAmount] = React.useState("100");

  const [picker, setPicker] = React.useState<"from" | "to" | null>(null);

  const adUnitId = __DEV__ ? TestIds.BANNER : "ca-app-pub-2653462201538649/1914759305";

  const loadRates = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await loadFx();
      setFx(r.fx);
      setFromCache(r.fromCache);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    mobileAds().initialize();
    loadRates();
  }, [loadRates]);

  async function onManualRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    setLastRefreshMsg("");
    try {
      const r = await refreshFxNow();
      setFx(r.fx);
      setFromCache(false);
      setLastRefreshMsg(t(lang, "refreshed"));
    } catch (e: any) {
      setLastRefreshMsg(`${t(lang, "refreshFailed")}: ${String(e?.message ?? e)}`);
    } finally {
      setRefreshing(false);
    }
  }

  // Layout: sticky bottom result panel height
  const stickyH = 168;
  const bottomPad = stickyH + 18;

  if (loading)
    return (
      <View style={[styles.center, { backgroundColor: UI.bg }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10, color: UI.muted, fontWeight: "800" }}>Loading rates…</Text>
      </View>
    );

  if (error)
    return (
      <View style={[styles.center, { backgroundColor: UI.bg, paddingHorizontal: 22 }]}>
        <View style={styles.errIcon}>
          <Ionicons name="warning-outline" size={22} color={UI.dark} />
        </View>
        <Text style={styles.errTitle}>{lang === "sq" ? "Nuk u ngarkuan të dhënat" : "Couldn’t load rates"}</Text>
        <Text style={styles.errSub}>
          {lang === "sq"
            ? "Kontrollo internetin dhe provo përsëri."
            : "Check your connection and try again."}
        </Text>

        <AnimatedPressable onPress={loadRates} style={styles.tryBtn}>
          <Ionicons name="refresh" size={18} color={UI.card} />
          <Text style={styles.tryTxt}>{lang === "sq" ? "Provo përsëri" : "Try again"}</Text>
        </AnimatedPressable>

        <Text style={styles.errRaw}>{error}</Text>
      </View>
    );

  if (!fx)
    return (
      <View style={[styles.center, { backgroundColor: UI.bg }]}>
        <Text style={{ color: UI.muted, fontWeight: "800" }}>No data.</Text>
      </View>
    );

  const currencies = listCurrencies(fx.rates);
  const amt = parseAmount(amount);
  const out = amt === null ? null : convert(amt, from, to, fx.rates);

  const outText = out === null ? "—" : formatMoney(out, to, lang);
  const outNumber = out === null ? null : out;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: UI.bg }]} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.screen}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandIcon}>
              <Ionicons name="airplane" size={18} color={UI.accent} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.h1}>{t(lang, "title")}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaPill}>
                  <Ionicons name="calendar-outline" size={14} color={UI.muted} />
                  <Text style={styles.metaTxt}>
                    {t(lang, "ratesDate")}: {fx.date}
                  </Text>
                </View>

                <View style={styles.metaPill}>
                  <Ionicons name={fromCache ? "cloud-offline-outline" : "pulse-outline"} size={14} color={UI.muted} />
                  <Text style={styles.metaTxt}>{fromCache ? t(lang, "cachedWorksOffline") : t(lang, "live")}</Text>
                </View>
              </View>

              {lastRefreshMsg ? (
                <View style={styles.msgRow}>
                  <Ionicons name="information-circle-outline" size={14} color={UI.muted} />
                  <Text style={styles.refreshMsg}>{lastRefreshMsg}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.headerRight}>
              <AnimatedPressable
                onPress={() => setLang((x) => (x === "en" ? "sq" : "en"))}
                style={styles.langPill}
                hitSlop={10}
              >
                <Ionicons name="globe-outline" size={14} color={UI.dark} />
                <Text style={styles.langTxt}>{lang.toUpperCase()}</Text>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={onManualRefresh}
                style={[styles.iconBtn, refreshing ? styles.iconBtnDisabled : null]}
                disabled={refreshing}
                hitSlop={10}
              >
                {refreshing ? <ActivityIndicator /> : <Ionicons name="refresh" size={18} color={UI.card} />}
              </AnimatedPressable>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TabBtn
              active={tab === "convert"}
              onPress={() => setTab("convert")}
              label={t(lang, "tabConvert")}
              icon="swap-horizontal"
            />
            <TabBtn
              active={tab === "checklist"}
              onPress={() => setTab("checklist")}
              label={t(lang, "tabChecklist")}
              icon="checkmark-done"
            />
            <TabBtn active={tab === "split"} onPress={() => setTab("split")} label={t(lang, "tabSplit")} icon="people" />
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            {tab === "convert" ? (
              <View style={{ flex: 1 }}>
                {/* Scrollable inputs */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardDismissMode="on-drag"
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingTop: 10, paddingBottom: bottomPad + insets.bottom + 20 }}
                >
                  <View style={styles.card}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="cash-outline" size={18} color={UI.accent} />
                      <Text style={styles.sectionTitle}>{t(lang, "tabConvert")}</Text>
                    </View>

                    <Text style={styles.label}>{t(lang, "amount")}</Text>
                    <View style={styles.amountRow}>
                      <View style={styles.inputIcon}>
                        <Ionicons name="calculator-outline" size={16} color={UI.muted} />
                      </View>
                      <TextInput
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        style={styles.input}
                      />
                    </View>

                    <View style={styles.row}>
                      <AnimatedPressable style={styles.selector} onPress={() => setPicker("from")}>
                        <View style={styles.selectorHead}>
                          <Ionicons name="log-in-outline" size={14} color={UI.muted} />
                          <Text style={styles.selectorTop}>{t(lang, "from")}</Text>
                        </View>
                        <Text style={styles.selectorCode}>{from}</Text>
                        <Text style={styles.selectorName}>{CURRENCY_NAMES[from] ?? "—"}</Text>
                      </AnimatedPressable>

                      <AnimatedPressable
                        style={styles.swapIcon}
                        onPress={() => {
                          setFrom(to);
                          setTo(from);
                        }}
                      >
                        <Ionicons name="swap-horizontal" size={18} color={UI.card} />
                      </AnimatedPressable>

                      <AnimatedPressable style={styles.selector} onPress={() => setPicker("to")}>
                        <View style={styles.selectorHead}>
                          <Ionicons name="log-out-outline" size={14} color={UI.muted} />
                          <Text style={styles.selectorTop}>{t(lang, "to")}</Text>
                        </View>
                        <Text style={styles.selectorCode}>{to}</Text>
                        <Text style={styles.selectorName}>{CURRENCY_NAMES[to] ?? "—"}</Text>
                      </AnimatedPressable>
                    </View>

                    <View style={styles.quickRow}>
                      {QUICK.filter((c) => currencies.includes(c)).map((c) => (
                        <AnimatedChip key={c} active={c === to} onPress={() => setTo(c)} label={c} />
                      ))}
                    </View>

                    {/* Rate lines (scrollable content) */}
                    <View style={styles.rateBox}>
                      <View style={styles.rateHeader}>
                        <Ionicons name="stats-chart-outline" size={16} color={UI.accent} />
                        <Text style={styles.rateTitle}>{lang === "sq" ? "Kurse" : "Rates"}</Text>
                      </View>

                      <Text style={styles.rateLine}>{formatRateLine(1, from, to, fx.rates, lang)}</Text>
                      <Text style={styles.rateLine}>{formatRateLine(1, to, from, fx.rates, lang)}</Text>
                    </View>

                    <CurrencyPicker
                      visible={picker !== null}
                      onClose={() => setPicker(null)}
                      currencies={currencies}
                      value={picker === "from" ? from : to}
                      onPick={(c) => (picker === "from" ? setFrom(c) : setTo(c))}
                      lang={lang}
                    />
                  </View>
                </ScrollView>

                {/* Sticky result panel */}
                <View pointerEvents="box-none" style={[styles.stickyWrap, { paddingBottom: insets.bottom + 10 }]}>
                  <View style={styles.stickyCard}>
                    <View style={styles.stickyTop}>
                      <View style={styles.stickyBadge}>
                        <Ionicons name="trending-up-outline" size={16} color={UI.accent} />
                      </View>
                      <Text style={styles.stickyLabel}>{t(lang, "result")}</Text>

                      <View style={{ flex: 1 }} />

                      <AnimatedPressable
                        style={styles.copyBtn}
                        onPress={async () => {
                          if (!outText || outText === "—") return;
                          await Clipboard.setStringAsync(outText);
                          setLastRefreshMsg(lang === "sq" ? "U kopjua" : "Copied");
                          setTimeout(() => setLastRefreshMsg(""), 1200);
                        }}
                      >
                        <Ionicons name="copy-outline" size={16} color={UI.dark} />
                      </AnimatedPressable>
                    </View>

                    <CountUpText
                      text={outText}
                      value={outNumber}
                      style={styles.stickyValue}
                      disabled={outNumber === null}
                    />

                    <Text style={styles.stickySmall}>
                      {from} → {to}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {tab === "checklist" ? <ChecklistScreen lang={lang} bottomPad={insets.bottom + 120} /> : null}
            {tab === "split" ? <SplitScreen lang={lang} fx={fx} currencies={currencies} bottomPad={insets.bottom + 120} /> : null}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Ad banner pinned to bottom */}
      <View style={[styles.adBar, { paddingBottom: insets.bottom }]}>
        <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
      </View>
    </SafeAreaView>
  );
}

function TabBtn(props: { active: boolean; onPress: () => void; label: string; icon: any }) {
  return (
    <AnimatedPressable
      onPress={props.onPress}
      style={[styles.tabBtn, props.active ? styles.tabBtnActive : null]}
      contentStyle={styles.tabBtnInner}
    >
      <Ionicons name={props.icon} size={16} color={props.active ? UI.card : UI.muted} style={{ marginRight: 8 }} />
      <Text style={[styles.tabTxt, props.active ? styles.tabTxtActive : null]}>{props.label}</Text>
    </AnimatedPressable>
  );
}

function AnimatedChip(props: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <AnimatedPressable
      onPress={props.onPress}
      style={[styles.chip, props.active ? styles.chipActive : null]}
      scaleIn={0.97}
    >
      <Text style={[styles.chipTxt, props.active ? styles.chipTxtActive : null]}>{props.label}</Text>
    </AnimatedPressable>
  );
}

function parseAmount(s: string) {
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Micro press-scale wrapper */
function AnimatedPressable({
  children,
  style,
  contentStyle,
  onPress,
  disabled,
  hitSlop,
  scaleIn = 0.96
}: {
  children: React.ReactNode;
  style?: any;
  contentStyle?: any;
  onPress?: () => void;
  disabled?: boolean;
  hitSlop?: any;
  scaleIn?: number;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const PressableAny = require("react-native").Pressable;

  const pressIn = () => {
    if (disabled) return;
    Animated.timing(scale, { toValue: scaleIn, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };

  const pressOut = () => {
    Animated.timing(scale, { toValue: 1, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <PressableAny
        onPress={onPress}
        disabled={disabled}
        hitSlop={hitSlop}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={contentStyle}
      >
        {children}
      </PressableAny>
    </Animated.View>
  );
}

// Pressable with proper typing separation
function TextPressable({
  children,
  onPress,
  disabled,
  hitSlop,
  onPressIn,
  onPressOut
}: any) {
  return (
    <View>
      {/* Pressable is imported? No: keep it local to avoid extra imports */}
      {/* eslint-disable-next-line react-native/no-inline-styles */}
      <View style={{}}>
        {/* fallback: use RN Pressable via require to keep file short */}
      </View>
    </View>
  );
}

/**
 * Because we didn’t import Pressable at top in this file (we removed it),
 * we define it here safely via require.
 */
const PressableAny = require("react-native").Pressable;

function TextPressableImpl(props: any) {
  return <PressableAny {...props} />;
}
// swap internal component ref
(TextPressable as any) = TextPressableImpl;

/** Smooth count-up for result (when numeric). Falls back to text when null/NaN. */
function CountUpText({
  value,
  text,
  style,
  disabled
}: {
  value: number | null;
  text: string;
  style?: any;
  disabled?: boolean;
}) {
  const [display, setDisplay] = React.useState(text);
  const prev = React.useRef<number | null>(null);
  const raf = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (disabled || value === null || !isFinite(value)) {
      prev.current = value;
      setDisplay(text);
      return;
    }

    const from = prev.current === null || !isFinite(prev.current) ? value : prev.current;
    const to = value;
    prev.current = value;

    const start = Date.now();
    const dur = 380;

    const step = () => {
      const t = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;

      // keep formatting exactly like your app (formatMoney) by using the provided final `text`
      // but to animate nicely, we’ll approximate with 2 decimals if it looks like money.
      // If you want perfect formatting during animation, tell me and we’ll parse currency from `text`.
      const approx = v;
      const s = approximateMoneyText(text, approx);
      setDisplay(s);

      if (t < 1) raf.current = requestAnimationFrame(step);
      else setDisplay(text);
    };

    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(step);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, text, disabled]);

  return <Text style={style}>{display}</Text>;
}

function approximateMoneyText(finalText: string, approx: number) {
  // If finalText is "—" or non-numeric-ish, just return finalText
  if (!finalText || finalText === "—") return finalText;

  // Keep currency symbol/prefix/suffix by extracting digits positions
  // Simple approach: replace first number-like chunk with approx formatted.
  const approxStr = formatApproxNumber(approx);

  const replaced = finalText.replace(/-?\d[\d\s.,]*/g, (m) => {
    // replace only first occurrence
    return approxStr;
  });

  return replaced;
}

function formatApproxNumber(n: number) {
  if (!isFinite(n)) return "—";
  const abs = Math.abs(n);
  const decimals = abs >= 1000 ? 0 : abs >= 100 ? 1 : 2;
  return n.toFixed(decimals);
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  errIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.04)",
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
    justifyContent: "center"
  },
  errTitle: { marginTop: 14, fontSize: 18, fontWeight: "900", color: UI.text },
  errSub: { marginTop: 6, color: UI.muted, fontWeight: "700", textAlign: "center" },
  tryBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: UI.dark
  },
  tryTxt: { color: UI.card, fontWeight: "900" },
  errRaw: { marginTop: 14, color: "rgba(15,23,42,0.45)", fontWeight: "700", fontSize: 12, textAlign: "center" },

  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 4 },

  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: UI.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: UI.border
  },

  h1: { fontSize: 22, fontWeight: "900", letterSpacing: -0.3, color: UI.text },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: UI.border
  },
  metaTxt: { color: UI.muted, fontSize: 12, fontWeight: "700" },

  msgRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  refreshMsg: { fontSize: 12, color: UI.muted, fontWeight: "700" },

  langPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: UI.border
  },
  langTxt: { fontSize: 12, fontWeight: "900", letterSpacing: 0.5, color: UI.dark },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: UI.dark,
    alignItems: "center",
    justifyContent: "center"
  },
  iconBtnDisabled: { opacity: 0.6 },

  tabs: { flexDirection: "row", gap: 10, marginTop: 14 },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row"
  },
  tabBtnActive: { backgroundColor: UI.dark, borderColor: "rgba(0,0,0,0.1)" },
  tabTxt: { fontWeight: "900", color: UI.muted },
  tabTxtActive: { color: UI.card },
  tabBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  card: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3
  },

  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: UI.text },

  label: { fontWeight: "900", color: UI.muted, marginTop: 6 },

  amountRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },

  inputIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.04)",
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
    justifyContent: "center"
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: "900",
    color: UI.text,
    backgroundColor: "rgba(15,23,42,0.02)"
  },

  row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },

  selector: {
    flex: 1,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(15,23,42,0.02)"
  },
  selectorHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  selectorTop: { fontSize: 12, fontWeight: "900", color: UI.muted },
  selectorCode: { marginTop: 8, fontSize: 18, fontWeight: "900", color: UI.text },
  selectorName: { marginTop: 2, color: UI.muted, fontWeight: "700" },

  swapIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: UI.dark,
    alignItems: "center",
    justifyContent: "center"
  },

  quickRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 14 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.03)",
    borderWidth: 1,
    borderColor: UI.border
  },
  chipActive: { backgroundColor: UI.accentSoft, borderColor: "rgba(37,99,235,0.25)" },
  chipTxt: { fontWeight: "900", color: UI.text },
  chipTxtActive: { color: UI.accent },

  rateBox: {
    marginTop: 16,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: "rgba(15,23,42,0.02)"
  },
  rateHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  rateTitle: { fontWeight: "900", color: UI.text },
  rateLine: { marginTop: 4, color: UI.muted, fontWeight: "800", fontSize: 12 },

  stickyWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16
  },
  stickyCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6
  },
  stickyTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  stickyBadge: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: UI.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.18)",
    alignItems: "center",
    justifyContent: "center"
  },
  stickyLabel: { fontWeight: "900", color: UI.muted },
  copyBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.04)",
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
    justifyContent: "center"
  },
  stickyValue: { marginTop: 10, fontSize: 32, fontWeight: "900", letterSpacing: -0.3, color: UI.text },
  stickySmall: { marginTop: 6, color: UI.muted, fontWeight: "800", fontSize: 12 },

  adBar: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.bg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)"
  }
});