import React from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { convert, type FxJson } from "../fx";
import { CURRENCY_NAMES } from "../currencies";
import { flagFor } from "../flags";
import { formatMoney, formatRateLine } from "../format";
import { t, type Lang } from "../i18n";
import { FONTS, RADIUS, gradientFor, useTheme } from "../theme";
import { Card, Chip, Pill, PressableScale, SectionHeader } from "../ui";
import { CurrencyPicker } from "../CurrencyPicker";
import { Sparkline } from "../components/Sparkline";
import { loadHistory, seriesChangePct, seriesFor, type HistoryJson } from "../history";

const QUICK = ["EUR", "ALL", "USD", "GBP", "CHF"];

export default function ConvertScreen({
  lang,
  fx,
  currencies,
  fromCache,
  bottomPad
}: {
  lang: Lang;
  fx: FxJson;
  currencies: string[];
  fromCache: boolean;
  bottomPad: number;
}) {
  const { palette } = useTheme();

  const [from, setFrom] = React.useState("EUR");
  const [to, setTo] = React.useState("ALL");
  const [amount, setAmount] = React.useState("100");
  const [picker, setPicker] = React.useState<"from" | "to" | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [history, setHistory] = React.useState<HistoryJson | null>(null);

  const swapSpin = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    let alive = true;
    loadHistory((fresh) => alive && setHistory(fresh)).then((h) => {
      if (alive && h) setHistory(h);
    });
    return () => {
      alive = false;
    };
  }, []);

  const amt = parseAmount(amount);
  const out = amt === null ? null : convert(amt, from, to, fx.rates);
  const outText = out === null ? "—" : formatMoney(out, to, lang);

  const series = React.useMemo(
    () => (history ? seriesFor(history, from, to, 30) : null),
    [history, from, to]
  );
  const changePct = series ? seriesChangePct(series) : null;

  const doSwap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    swapSpin.setValue(0);
    Animated.timing(swapSpin, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
    setFrom(to);
    setTo(from);
  };

  const doCopy = async () => {
    if (!outText || outText === "—") return;
    await Clipboard.setStringAsync(outText);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const spin = swapSpin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const gradient = gradientFor(to);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 6, paddingBottom: bottomPad }}
      >
        {/* ── Hero ─────────────────────────────────────────────── */}
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1.1, y: 1.2 }}
          style={[styles.hero, { shadowColor: gradient[1] }]}
        >
          <View style={styles.heroTopRow}>
            <View style={[styles.heroPill, { backgroundColor: palette.heroChip }]}>
              <Ionicons
                name={fromCache ? "cloud-offline-outline" : "pulse-outline"}
                size={12}
                color={palette.heroText}
              />
              <Text style={[styles.heroPillTxt, { color: palette.heroText }]}>
                {fromCache ? t(lang, "cached") : t(lang, "live")} · {fx.date}
              </Text>
            </View>

            <Pressable onPress={doCopy} hitSlop={8} style={[styles.heroIconBtn, { backgroundColor: palette.heroChip }]}>
              <Ionicons name={copied ? "checkmark" : "copy-outline"} size={15} color={palette.heroText} />
            </Pressable>
          </View>

          {/* You have */}
          <Text style={[styles.heroLabel, { color: palette.heroMuted }]}>{t(lang, "youSend")}</Text>
          <View style={styles.heroRow}>
            <CurrencyChip code={from} onPress={() => setPicker("from")} chipBg={palette.heroChip} fg={palette.heroText} />
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={palette.heroMuted}
              style={[styles.heroInput, { color: palette.heroText }]}
              selectionColor={palette.heroText}
            />
          </View>

          {/* Divider + swap */}
          <View style={styles.heroDividerRow}>
            <View style={[styles.heroDivider, { backgroundColor: "rgba(255,255,255,0.22)" }]} />
            <PressableScale onPress={doSwap} scaleIn={0.88}>
              <Animated.View
                style={[
                  styles.swapBtn,
                  { backgroundColor: "rgba(255,255,255,0.95)", transform: [{ rotate: spin }] }
                ]}
              >
                <Ionicons name="swap-vertical" size={19} color={gradient[0]} />
              </Animated.View>
            </PressableScale>
            <View style={[styles.heroDivider, { backgroundColor: "rgba(255,255,255,0.22)" }]} />
          </View>

          {/* You get */}
          <Text style={[styles.heroLabel, { color: palette.heroMuted }]}>{t(lang, "theyGet")}</Text>
          <View style={styles.heroRow}>
            <CurrencyChip code={to} onPress={() => setPicker("to")} chipBg={palette.heroChip} fg={palette.heroText} />
            <CountUpText
              text={outText}
              value={out}
              disabled={out === null}
              style={[styles.heroResult, { color: palette.heroText }]}
            />
          </View>

          <View style={styles.heroFootRow}>
            <Text style={[styles.heroRate, { color: palette.heroMuted }]} numberOfLines={1}>
              {formatRateLine(1, from, to, fx.rates, lang)}
            </Text>
            {changePct !== null ? (
              <View style={[styles.heroPill, { backgroundColor: palette.heroChip }]}>
                <Ionicons
                  name={changePct >= 0 ? "trending-up-outline" : "trending-down-outline"}
                  size={12}
                  color={palette.heroText}
                />
                <Text style={[styles.heroPillTxt, { color: palette.heroText }]}>
                  {changePct >= 0 ? "+" : ""}
                  {changePct.toFixed(2)}% · 30d
                </Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        {/* ── Quick pick ───────────────────────────────────────── */}
        <Text style={[styles.quickLabel, { color: palette.muted, fontFamily: FONTS.bodySemi }]}>
          {t(lang, "quickPick")}
        </Text>
        <View style={styles.quickRow}>
          {QUICK.filter((c) => currencies.includes(c)).map((c) => (
            <Chip
              key={c}
              label={c}
              active={c === to}
              onPress={() => setTo(c)}
              leading={<Text style={{ fontSize: 13 }}>{flagFor(c)}</Text>}
            />
          ))}
        </View>

        {/* ── Trend ────────────────────────────────────────────── */}
        {series ? (
          <Card style={{ marginTop: 16 }}>
            <SectionHeader
              icon="trending-up-outline"
              title={`${from} → ${to}`}
              right={
                changePct !== null ? (
                  <Pill
                    icon={changePct >= 0 ? "arrow-up" : "arrow-down"}
                    label={`${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`}
                    tone={changePct >= 0 ? "success" : "danger"}
                  />
                ) : undefined
              }
            />
            <Sparkline data={series.map((p) => p.rate)} stroke={palette.accent} />
            <View style={styles.trendFootRow}>
              <Text style={{ fontFamily: FONTS.bodyMed, fontSize: 11, color: palette.faint }}>
                {series[0].date}
              </Text>
              <Text style={{ fontFamily: FONTS.bodyMed, fontSize: 11, color: palette.muted }}>
                {t(lang, "last30d")}
              </Text>
              <Text style={{ fontFamily: FONTS.bodyMed, fontSize: 11, color: palette.faint }}>
                {series[series.length - 1].date}
              </Text>
            </View>
          </Card>
        ) : null}

        {/* ── Rates both ways ──────────────────────────────────── */}
        <Card style={{ marginTop: 16 }}>
          <SectionHeader icon="stats-chart-outline" title={t(lang, "rates")} />
          <RateRow flag={flagFor(from)} line={formatRateLine(1, from, to, fx.rates, lang)} />
          <RateRow flag={flagFor(to)} line={formatRateLine(1, to, from, fx.rates, lang)} />
        </Card>
      </ScrollView>

      <CurrencyPicker
        visible={picker !== null}
        onClose={() => setPicker(null)}
        currencies={currencies}
        value={picker === "from" ? from : to}
        onPick={(c) => (picker === "from" ? setFrom(c) : setTo(c))}
        lang={lang}
      />
    </View>
  );
}

function CurrencyChip({
  code,
  onPress,
  chipBg,
  fg
}: {
  code: string;
  onPress: () => void;
  chipBg: string;
  fg: string;
}) {
  return (
    <PressableScale onPress={onPress} scaleIn={0.95} haptic>
      <View style={[styles.currencyChip, { backgroundColor: chipBg }]}>
        <Text style={{ fontSize: 18 }}>{flagFor(code)}</Text>
        <Text style={{ fontFamily: FONTS.displaySemi, fontSize: 16, color: fg }}>{code}</Text>
        <Ionicons name="chevron-down" size={14} color={fg} style={{ opacity: 0.8 }} />
      </View>
    </PressableScale>
  );
}

function RateRow({ flag, line }: { flag: string; line: string }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.rateRow, { borderTopColor: palette.border }]}>
      <Text style={{ fontSize: 16 }}>{flag}</Text>
      <Text style={{ flex: 1, fontFamily: FONTS.bodySemi, fontSize: 13, color: palette.muted }}>{line}</Text>
    </View>
  );
}

function parseAmount(s: string) {
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Animates between values with a count-up effect, then settles on the exact formatted text. */
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

    const fromV = prev.current === null || !isFinite(prev.current) ? value : prev.current;
    prev.current = value;

    const start = Date.now();
    const dur = 380;

    const step = () => {
      const p = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = fromV + (value - fromV) * eased;
      setDisplay(approximateMoneyText(text, v));
      if (p < 1) raf.current = requestAnimationFrame(step);
      else setDisplay(text);
    };

    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(step);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, text, disabled]);

  return (
    <Text style={style} numberOfLines={1} adjustsFontSizeToFit>
      {display}
    </Text>
  );
}

function approximateMoneyText(finalText: string, approx: number) {
  if (!finalText || finalText === "—") return finalText;
  const abs = Math.abs(approx);
  const decimals = abs >= 1000 ? 0 : abs >= 100 ? 1 : 2;
  return finalText.replace(/-?\d[\d\s.,]*/g, () => approx.toFixed(decimals));
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: RADIUS.xl + 2,
    padding: 20,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill
  },
  heroPillTxt: { fontFamily: FONTS.bodySemi, fontSize: 11 },
  heroIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center"
  },

  heroLabel: { fontFamily: FONTS.bodyMed, fontSize: 12, marginBottom: 8 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 12 },

  currencyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md
  },

  heroInput: {
    flex: 1,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 34,
    textAlign: "right",
    padding: 0
  },
  heroResult: {
    flex: 1,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 34,
    textAlign: "right"
  },

  heroDividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 14 },
  heroDivider: { flex: 1, height: 1 },
  swapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },

  heroFootRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 18
  },
  heroRate: { flex: 1, fontFamily: FONTS.bodyMed, fontSize: 12 },

  quickLabel: { fontSize: 12, marginTop: 18, marginBottom: 10, marginLeft: 2 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  trendFootRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8
  },

  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderTopWidth: 1
  }
});
