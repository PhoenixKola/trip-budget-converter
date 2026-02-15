import React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import mobileAds, { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";

import { convert, listCurrencies, loadFx, refreshFxNow } from "./src/fx";
import { CurrencyPicker } from "./src/CurrencyPicker";
import { CURRENCY_NAMES } from "./src/currencies";
import { t, type Lang } from "./src/i18n";
import { formatMoney, formatRateLine } from "./src/format";
import ChecklistScreen from "./src/screens/ChecklistScreen";
import SplitScreen from "./src/screens/SplitScreen";

const QUICK = ["EUR", "ALL", "USD", "GBP"];
type Tab = "convert" | "checklist" | "split";

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

  React.useEffect(() => {
    mobileAds().initialize();

    (async () => {
      try {
        const r = await loadFx();
        setFx(r.fx);
        setFromCache(r.fromCache);
      } catch (e: any) {
        setError(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10 }}>Loading rates…</Text>
      </View>
    );

  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{error}</Text>
      </View>
    );

  if (!fx)
    return (
      <View style={styles.center}>
        <Text>No data.</Text>
      </View>
    );

  const currencies = listCurrencies(fx.rates);
  const amt = parseAmount(amount);
  const out = amt === null ? null : convert(amt, from, to, fx.rates);

  const adUnitId = __DEV__ ? TestIds.BANNER : "ca-app-pub-2653462201538649/1914759305";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={[styles.screen, { paddingTop: Math.max(12, insets.top + 6) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.h1}>{t(lang, "title")}</Text>

              <View style={styles.metaRow}>
                <Text style={styles.sub}>
                  {t(lang, "ratesDate")}: {fx.date}
                </Text>

                <Text style={styles.dot}>•</Text>

                <Text style={styles.sub}>
                  {fromCache ? t(lang, "cachedWorksOffline") : t(lang, "live")}
                </Text>
              </View>

              {lastRefreshMsg ? <Text style={styles.refreshMsg}>{lastRefreshMsg}</Text> : null}
            </View>

            <View style={styles.headerRight}>
              <Pressable
                onPress={() => setLang((x) => (x === "en" ? "sq" : "en"))}
                style={styles.langPill}
                hitSlop={10}
              >
                <Text style={styles.langTxt}>{lang.toUpperCase()}</Text>
              </Pressable>

              <Pressable
                onPress={onManualRefresh}
                style={[styles.refreshBtn, refreshing ? styles.refreshBtnDisabled : null]}
                disabled={refreshing}
                hitSlop={10}
              >
                {refreshing ? <ActivityIndicator /> : <Text style={styles.refreshTxt}>↻</Text>}
              </Pressable>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TabBtn active={tab === "convert"} onPress={() => setTab("convert")} label={t(lang, "tabConvert")} />
            <TabBtn
              active={tab === "checklist"}
              onPress={() => setTab("checklist")}
              label={t(lang, "tabChecklist")}
            />
            <TabBtn active={tab === "split"} onPress={() => setTab("split")} label={t(lang, "tabSplit")} />
          </View>

          {/* Content */}
          {tab === "convert" ? (
            <View style={styles.card}>
              <Text style={styles.label}>{t(lang, "amount")}</Text>

              <View style={styles.amountRow}>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  style={styles.input}
                />
              </View>

              <View style={styles.row}>
                <Pressable style={styles.selector} onPress={() => setPicker("from")}>
                  <Text style={styles.selectorTop}>{t(lang, "from")}</Text>
                  <Text style={styles.selectorCode}>{from}</Text>
                  <Text style={styles.selectorName}>{CURRENCY_NAMES[from] ?? "—"}</Text>
                </Pressable>

                <Pressable
                  style={styles.swapIcon}
                  onPress={() => {
                    setFrom(to);
                    setTo(from);
                  }}
                >
                  <Text style={styles.swapIconTxt}>⇄</Text>
                </Pressable>

                <Pressable style={styles.selector} onPress={() => setPicker("to")}>
                  <Text style={styles.selectorTop}>{t(lang, "to")}</Text>
                  <Text style={styles.selectorCode}>{to}</Text>
                  <Text style={styles.selectorName}>{CURRENCY_NAMES[to] ?? "—"}</Text>
                </Pressable>
              </View>

              <View style={styles.quickRow}>
                {QUICK.filter((c) => currencies.includes(c)).map((c) => (
                  <Pressable key={c} style={styles.chip} onPress={() => setTo(c)}>
                    <Text style={styles.chipTxt}>{c}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.resultBox}>
                <Text style={styles.resultLabel}>{t(lang, "result")}</Text>

                <Text style={styles.result}>{out === null ? "—" : formatMoney(out, to, lang)}</Text>

                <View style={styles.rateLines}>
                  <Text style={styles.rateLine}>{formatRateLine(1, from, to, fx.rates, lang)}</Text>
                  <Text style={styles.rateLine}>{formatRateLine(1, to, from, fx.rates, lang)}</Text>
                </View>
              </View>

              <CurrencyPicker
                visible={picker !== null}
                onClose={() => setPicker(null)}
                currencies={currencies}
                value={picker === "from" ? from : to}
                onPick={(c) => (picker === "from" ? setFrom(c) : setTo(c))}
              />
            </View>
          ) : null}

          {tab === "checklist" ? <ChecklistScreen lang={lang} /> : null}
          {tab === "split" ? <SplitScreen lang={lang} fx={fx} currencies={currencies} /> : null}
        </View>
      </KeyboardAvoidingView>

      {/* Ad banner pinned to bottom */}
      <View style={[styles.adBar, { paddingBottom: Platform.OS === "android" ? 6 : 0 }]}>
        <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
      </View>
    </SafeAreaView>
  );
}

function TabBtn(props: { active: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={props.onPress} style={[styles.tabBtn, props.active ? styles.tabBtnActive : null]}>
      <Text style={[styles.tabTxt, props.active ? styles.tabTxtActive : null]}>{props.label}</Text>
    </Pressable>
  );
}

function parseAmount(s: string) {
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  screen: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16, gap: 12 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  err: { color: "crimson" },

  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 4 },

  h1: { fontSize: 28, fontWeight: "900", letterSpacing: -0.4 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  sub: { opacity: 0.65, fontSize: 13 },
  dot: { marginHorizontal: 8, opacity: 0.35 },

  refreshMsg: { marginTop: 6, fontSize: 12, opacity: 0.75 },

  langPill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "#f2f2f2" },
  langTxt: { fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },

  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center"
  },
  refreshBtnDisabled: { opacity: 0.6 },
  refreshTxt: { color: "#fff", fontSize: 16, fontWeight: "900" },

  tabs: { flexDirection: "row", gap: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: "#f4f4f4", alignItems: "center" },
  tabBtnActive: { backgroundColor: "#000" },
  tabTxt: { fontWeight: "800", opacity: 0.75 },
  tabTxtActive: { color: "#fff", opacity: 1 },

  card: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
    gap: 12
  },

  label: { fontWeight: "800", opacity: 0.7 },

  amountRow: { flexDirection: "row", gap: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 22,
    fontWeight: "800"
  },

  row: { flexDirection: "row", alignItems: "center", gap: 10 },

  selector: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  selectorTop: { fontSize: 12, fontWeight: "800", opacity: 0.6 },
  selectorCode: { marginTop: 6, fontSize: 18, fontWeight: "900" },
  selectorName: { marginTop: 2, opacity: 0.7 },

  swapIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center"
  },
  swapIconTxt: { color: "#fff", fontSize: 18, fontWeight: "900" },

  quickRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#eee"
  },
  chipTxt: { fontWeight: "800" },

  resultBox: { marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  resultLabel: { fontWeight: "800", opacity: 0.6 },
  result: { marginTop: 6, fontSize: 36, fontWeight: "900", letterSpacing: -0.3 },

  rateLines: { marginTop: 8, gap: 4 },
  rateLine: { fontSize: 12, opacity: 0.65 },

  adBar: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)"
  }
});