import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import mobileAds, { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import { useFonts } from "expo-font";
import { SpaceGrotesk_500Medium } from "@expo-google-fonts/space-grotesk/500Medium";
import { SpaceGrotesk_600SemiBold } from "@expo-google-fonts/space-grotesk/600SemiBold";
import { SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk/700Bold";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";

import { listCurrencies, readCachedFx, refreshFxNow, type FxJson } from "./src/fx";
import { t, type Lang } from "./src/i18n";
import { getJson, setJson } from "./src/storage";
import { BRAND_GRADIENT, FONTS, ThemeProvider, useTheme } from "./src/theme";
import { Button } from "./src/ui";
import { TabBar, type TabDef } from "./src/components/TabBar";
import { SettingsSheet } from "./src/components/SettingsSheet";
import ConvertScreen from "./src/screens/ConvertScreen";
import ChecklistScreen from "./src/screens/ChecklistScreen";
import SplitScreen from "./src/screens/SplitScreen";

type Tab = "convert" | "checklist" | "split";

const LANG_KEY = "app_lang_v1";
const TAB_BAR_SPACE = 92; // floating tab bar height + breathing room, added to scroll padding

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#0b1220" }} />;
  }

  return (
    <ThemeProvider>
      <Main />
    </ThemeProvider>
  );
}

function Main() {
  const { palette, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = React.useState<Tab>("convert");
  const [lang, setLang] = React.useState<Lang>("en");
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [fx, setFx] = React.useState<FxJson | null>(null);
  const [fromCache, setFromCache] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshMsg, setRefreshMsg] = React.useState("");

  const adUnitId = __DEV__ ? TestIds.BANNER : "ca-app-pub-2653462201538649/1914759305";

  React.useEffect(() => {
    getJson<Lang>(LANG_KEY, "en")
      .then((l) => (l === "en" || l === "sq") && setLang(l))
      .catch(() => {});
  }, []);

  const onLang = (l: Lang) => {
    setLang(l);
    setJson(LANG_KEY, l).catch(() => {});
  };

  const loadRates = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const cached = await readCachedFx();

      if (cached) {
        setFx(cached);
        setFromCache(true);
        setLoading(false);

        try {
          const r = await refreshFxNow();
          setFx(r.fx);
          setFromCache(false);
        } catch (e) {
          console.warn("Background refresh failed:", e);
        }
        return;
      }

      const r = await refreshFxNow();
      setFx(r.fx);
      setFromCache(false);
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
    setRefreshMsg("");
    try {
      const r = await refreshFxNow();
      setFx(r.fx);
      setFromCache(false);
      setRefreshMsg(t(lang, "refreshed"));
    } catch (e: any) {
      setRefreshMsg(`${t(lang, "refreshFailed")}: ${String(e?.message ?? e)}`);
    } finally {
      setRefreshing(false);
    }
  }

  const tabs: TabDef<Tab>[] = [
    { key: "convert", label: t(lang, "tabConvert"), icon: "swap-horizontal-outline", iconActive: "swap-horizontal" },
    { key: "checklist", label: t(lang, "tabChecklist"), icon: "checkmark-done-outline", iconActive: "checkmark-done" },
    { key: "split", label: t(lang, "tabSplit"), icon: "people-outline", iconActive: "people" }
  ];

  const bottomPad = TAB_BAR_SPACE + 16;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} edges={["top", "left", "right"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.screen}>
          {/* ── Header ─────────────────────────────────────────── */}
          <View style={styles.header}>
            <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.brandBadge}>
              <Ionicons name="airplane" size={17} color="#FFFFFF" />
            </LinearGradient>

            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.display, fontSize: 20, color: palette.text, letterSpacing: -0.4 }}>
                {t(lang, "title")}
              </Text>
              <Text style={{ fontFamily: FONTS.bodyMed, fontSize: 12, color: palette.muted, marginTop: 1 }}>
                {t(lang, "subtitle")}
              </Text>
            </View>

            <Pressable
              onPress={() => setSettingsOpen(true)}
              hitSlop={8}
              style={[styles.settingsBtn, { backgroundColor: palette.card, borderColor: palette.border }]}
            >
              <Ionicons name="settings-outline" size={18} color={palette.text} />
            </Pressable>
          </View>

          {/* ── Content ────────────────────────────────────────── */}
          <View style={{ flex: 1 }}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={palette.accent} size="large" />
                <Text style={{ marginTop: 12, color: palette.muted, fontFamily: FONTS.bodySemi }}>
                  {lang === "sq" ? "Duke ngarkuar kurset…" : "Loading rates…"}
                </Text>
              </View>
            ) : error ? (
              <View style={[styles.center, { paddingHorizontal: 12 }]}>
                <View style={[styles.errIcon, { backgroundColor: palette.dangerSoft }]}>
                  <Ionicons name="cloud-offline-outline" size={24} color={palette.danger} />
                </View>
                <Text style={{ marginTop: 14, fontSize: 18, fontFamily: FONTS.display, color: palette.text }}>
                  {lang === "sq" ? "Nuk u ngarkuan të dhënat" : "Couldn’t load rates"}
                </Text>
                <Text
                  style={{
                    marginTop: 6,
                    color: palette.muted,
                    fontFamily: FONTS.bodyMed,
                    textAlign: "center"
                  }}
                >
                  {lang === "sq" ? "Kontrollo internetin dhe provo përsëri." : "Check your connection and try again."}
                </Text>
                <Button
                  label={lang === "sq" ? "Provo përsëri" : "Try again"}
                  icon="refresh"
                  onPress={loadRates}
                  style={{ marginTop: 18 }}
                />
                <Text style={{ marginTop: 14, color: palette.faint, fontFamily: FONTS.body, fontSize: 11 }}>
                  {error}
                </Text>
              </View>
            ) : fx ? (
              <>
                {tab === "convert" ? (
                  <ConvertScreen
                    lang={lang}
                    fx={fx}
                    currencies={listCurrencies(fx.rates)}
                    fromCache={fromCache}
                    bottomPad={bottomPad}
                  />
                ) : null}
                {tab === "checklist" ? <ChecklistScreen lang={lang} bottomPad={bottomPad} /> : null}
                {tab === "split" ? (
                  <SplitScreen lang={lang} fx={fx} currencies={listCurrencies(fx.rates)} bottomPad={bottomPad} />
                ) : null}
              </>
            ) : (
              <View style={styles.center}>
                <Text style={{ color: palette.muted, fontFamily: FONTS.bodySemi }}>No data.</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Floating tab bar ─────────────────────────────────── */}
        <View pointerEvents="box-none" style={styles.tabBarWrap}>
          <TabBar<Tab> tabs={tabs} active={tab} onChange={setTab} />
        </View>
      </KeyboardAvoidingView>

      {/* ── Ad banner ──────────────────────────────────────────── */}
      <View style={[styles.adBar, { paddingBottom: insets.bottom, backgroundColor: palette.bg, borderTopColor: palette.border }]}>
        <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
      </View>

      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        lang={lang}
        onLang={onLang}
        fxDate={fx?.date}
        fromCache={fromCache}
        refreshing={refreshing}
        onRefresh={onManualRefresh}
        refreshMsg={refreshMsg}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: 18, paddingTop: 8 },

  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  brandBadge: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errIcon: {
    width: 52,
    height: 52,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },

  tabBarWrap: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 14
  },

  adBar: {
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1
  }
});
