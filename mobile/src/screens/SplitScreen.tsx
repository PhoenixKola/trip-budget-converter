import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { Lang } from "../i18n";
import { t } from "../i18n";
import { convert, type FxJson } from "../fx";
import { formatMoney } from "../format";
import { CurrencyPicker } from "../CurrencyPicker";
import { CURRENCY_NAMES } from "../currencies";
import { flagFor } from "../flags";
import { FONTS, RADIUS, gradientFor, useTheme } from "../theme";
import { Card, Chip, PressableScale, SectionHeader } from "../ui";

const TIP_PRESETS = [0, 5, 10, 15, 20];
const MAX_PEOPLE = 50;

export default function SplitScreen(props: { lang: Lang; fx: FxJson; currencies: string[]; bottomPad?: number }) {
  const { lang, fx, currencies, bottomPad } = props;
  const { palette } = useTheme();
  const pad = bottomPad ?? 110;

  const [total, setTotal] = React.useState("100");
  const [people, setPeople] = React.useState(2);
  const [tip, setTip] = React.useState("0");

  const [paidIn, setPaidIn] = React.useState("EUR");
  const [settleIn, setSettleIn] = React.useState("ALL");

  const [picker, setPicker] = React.useState<"paid" | "settle" | null>(null);

  const totalN = parseNum(total);
  const tipN = parseNum(tip);
  const valid = totalN !== null && people > 0 && tipN !== null;

  const totalWithTip = valid ? totalN! * (1 + tipN! / 100) : null;
  const totalInSettle =
    totalWithTip === null
      ? null
      : paidIn === settleIn
        ? totalWithTip
        : convert(totalWithTip, paidIn, settleIn, fx.rates);
  const perPerson = totalInSettle === null ? null : totalInSettle / people;

  const bump = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    setPeople((p) => Math.max(1, Math.min(MAX_PEOPLE, p + delta)));
  };

  const gradient = gradientFor(settleIn);
  const shareSegments = Math.min(people, 12);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: pad, paddingTop: 6 }}
        style={{ flex: 1 }}
      >
        {/* ── Result hero ──────────────────────────────────────── */}
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1.1, y: 1.2 }}
          style={[styles.hero, { shadowColor: gradient[1] }]}
        >
          <View style={styles.heroTop}>
            <Text style={{ fontFamily: FONTS.bodyMed, fontSize: 12, color: palette.heroMuted }}>
              {t(lang, "perPerson")}
            </Text>
            <View style={[styles.peoplePill, { backgroundColor: palette.heroChip }]}>
              <Ionicons name="people" size={12} color={palette.heroText} />
              <Text style={{ fontFamily: FONTS.bodySemi, fontSize: 11, color: palette.heroText }}>×{people}</Text>
            </View>
          </View>

          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ fontFamily: FONTS.display, fontSize: 38, color: palette.heroText, marginTop: 8 }}
          >
            {perPerson === null || !isFinite(perPerson) ? "—" : formatMoney(perPerson, settleIn, lang)}
          </Text>

          {/* share bar */}
          <View style={styles.shareBar}>
            {Array.from({ length: shareSegments }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.shareSeg,
                  { backgroundColor: palette.heroText, opacity: i % 2 === 0 ? 0.85 : 0.45 }
                ]}
              />
            ))}
          </View>

          {totalInSettle !== null && isFinite(totalInSettle) ? (
            <View style={styles.heroFoot}>
              <Ionicons name="receipt-outline" size={13} color={palette.heroMuted} />
              <Text style={{ fontFamily: FONTS.bodyMed, fontSize: 12, color: palette.heroMuted }}>
                {t(lang, "totalWithTip")}: {formatMoney(totalInSettle, settleIn, lang)}
              </Text>
            </View>
          ) : null}
        </LinearGradient>

        {/* ── Details ──────────────────────────────────────────── */}
        <Card style={{ marginTop: 16 }}>
          <SectionHeader icon="receipt-outline" title={t(lang, "details")} />

          <Text style={[styles.label, { color: palette.muted }]}>{t(lang, "total")}</Text>
          <View style={[styles.inputRow, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
            <Ionicons name="cash-outline" size={16} color={palette.muted} />
            <TextInput
              value={total}
              onChangeText={setTotal}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={palette.faint}
              style={[styles.input, { color: palette.text }]}
            />
            <Text style={{ fontFamily: FONTS.bodySemi, fontSize: 13, color: palette.muted }}>{paidIn}</Text>
          </View>

          <View style={styles.twoCol}>
            {/* People stepper */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: palette.muted }]}>{t(lang, "people")}</Text>
              <View style={[styles.stepper, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
                <Pressable
                  onPress={() => bump(-1)}
                  hitSlop={6}
                  style={[styles.stepBtn, { backgroundColor: palette.card, borderColor: palette.border }]}
                >
                  <Ionicons name="remove" size={17} color={palette.text} />
                </Pressable>

                <View style={styles.stepMid}>
                  <Ionicons name="person" size={13} color={palette.muted} />
                  <Text style={{ fontFamily: FONTS.displaySemi, fontSize: 17, color: palette.text }}>{people}</Text>
                </View>

                <Pressable
                  onPress={() => bump(1)}
                  hitSlop={6}
                  style={[styles.stepBtn, { backgroundColor: palette.accent, borderColor: palette.accent }]}
                >
                  <Ionicons name="add" size={17} color={palette.onAccent} />
                </Pressable>
              </View>
            </View>

            {/* Tip input */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: palette.muted }]}>{t(lang, "tip")} %</Text>
              <View style={[styles.inputRow, { backgroundColor: palette.inputBg, borderColor: palette.border, marginTop: 8 }]}>
                <Ionicons name="pricetag-outline" size={15} color={palette.muted} />
                <TextInput
                  value={tip}
                  onChangeText={setTip}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={palette.faint}
                  style={[styles.input, { color: palette.text }]}
                />
              </View>
            </View>
          </View>

          {/* Tip presets */}
          <View style={styles.chipRow}>
            {TIP_PRESETS.map((p) => (
              <Chip key={p} label={`${p}%`} active={tipN === p} onPress={() => setTip(String(p))} />
            ))}
          </View>

          {/* Currencies */}
          <View style={[styles.twoCol, { marginTop: 16 }]}>
            <Selector
              label={t(lang, "paidIn")}
              code={paidIn}
              onPress={() => setPicker("paid")}
            />

            <PressableScale
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                setPaidIn(settleIn);
                setSettleIn(paidIn);
              }}
              scaleIn={0.88}
            >
              <View style={[styles.swapBtn, { backgroundColor: palette.accent }]}>
                <Ionicons name="swap-horizontal" size={18} color={palette.onAccent} />
              </View>
            </PressableScale>

            <Selector
              label={t(lang, "splitIn")}
              code={settleIn}
              onPress={() => setPicker("settle")}
            />
          </View>
        </Card>
      </ScrollView>

      <CurrencyPicker
        visible={picker !== null}
        onClose={() => setPicker(null)}
        currencies={currencies}
        value={picker === "paid" ? paidIn : settleIn}
        onPick={(c) => (picker === "paid" ? setPaidIn(c) : setSettleIn(c))}
        lang={lang}
      />
    </View>
  );
}

function Selector({ label, code, onPress }: { label: string; code: string; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <PressableScale onPress={onPress} style={{ flex: 1 }} scaleIn={0.97} haptic>
      <View style={[styles.selector, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
        <Text style={{ fontFamily: FONTS.bodyMed, fontSize: 11, color: palette.muted }}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 6 }}>
          <Text style={{ fontSize: 17 }}>{flagFor(code)}</Text>
          <Text style={{ fontFamily: FONTS.displaySemi, fontSize: 16, color: palette.text }}>{code}</Text>
          <Ionicons name="chevron-down" size={13} color={palette.faint} />
        </View>
        <Text numberOfLines={1} style={{ fontFamily: FONTS.bodyMed, fontSize: 11, color: palette.faint, marginTop: 3 }}>
          {CURRENCY_NAMES[code] ?? "—"}
        </Text>
      </View>
    </PressableScale>
  );
}

function parseNum(s: string) {
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
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
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  peoplePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill
  },

  shareBar: { flexDirection: "row", gap: 4, marginTop: 16 },
  shareSeg: { flex: 1, height: 6, borderRadius: 3 },

  heroFoot: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },

  label: { fontFamily: FONTS.bodySemi, fontSize: 12, marginTop: 14 },

  inputRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  input: { flex: 1, fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", padding: 0 },

  twoCol: { flexDirection: "row", alignItems: "flex-end", gap: 10, marginTop: 2 },

  stepper: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 6
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  stepMid: { flexDirection: "row", alignItems: "center", gap: 5 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },

  selector: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 13,
    paddingVertical: 12
  },

  swapBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14
  }
});
