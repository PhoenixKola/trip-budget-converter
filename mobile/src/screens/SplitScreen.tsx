import React from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Lang } from "../i18n";
import { convert } from "../fx";
import { formatMoney } from "../format";
import { CurrencyPicker } from "../CurrencyPicker";
import { CURRENCY_NAMES } from "../currencies";

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

export default function SplitScreen(props: { lang: Lang; fx: any; currencies: string[]; bottomPad?: number }) {
  const { lang, fx, currencies, bottomPad } = props;
  const pad = bottomPad ?? 110;

  const [total, setTotal] = React.useState("100");
  const [people, setPeople] = React.useState("2");
  const [tip, setTip] = React.useState("0");

  const [paidIn, setPaidIn] = React.useState("EUR");
  const [settleIn, setSettleIn] = React.useState("ALL");

  const [picker, setPicker] = React.useState<"paid" | "settle" | null>(null);

  const totalN = parseNum(total);
  const peopleN = parseInt(people || "0", 10);
  const tipN = parseNum(tip);

  const valid = totalN !== null && peopleN > 0 && tipN !== null;

  const totalWithTip = valid ? totalN! * (1 + tipN! / 100) : null;

  const totalInSettle =
    totalWithTip === null ? null : paidIn === settleIn ? totalWithTip : convert(totalWithTip, paidIn, settleIn, fx.rates);

  const perPerson = totalInSettle === null ? null : totalInSettle / peopleN;

  const title = lang === "sq" ? "Ndarja e faturës" : "Split costs";
  const hint = lang === "sq" ? "Opsionale: edhe me bakshish" : "Optional: include tip";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: pad, paddingTop: 10 }}
      style={{ flex: 1 }}
    >
      <View style={styles.top}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <Ionicons name="people-outline" size={18} color={UI.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.sub}>{hint}</Text>
          </View>
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>{lang === "sq" ? "Për person" : "Per person"}</Text>
          <Text style={styles.resultValue}>
            {perPerson === null || !isFinite(perPerson) ? "—" : formatMoney(perPerson, settleIn, lang)}
          </Text>

          {totalInSettle !== null ? (
            <View style={styles.smallRow}>
              <Ionicons name="receipt-outline" size={14} color={UI.muted} />
              <Text style={styles.small}>
                {lang === "sq" ? "Totali (me bakshish)" : "Total (with tip)"}: {formatMoney(totalInSettle, settleIn, lang)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{lang === "sq" ? "Detajet" : "Details"}</Text>

          <Text style={styles.label}>{lang === "sq" ? "Totali" : "Total"}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="cash-outline" size={16} color={UI.muted} />
            <TextInput value={total} onChangeText={setTotal} keyboardType="decimal-pad" style={styles.input} />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{lang === "sq" ? "Persona" : "People"}</Text>
              <View style={styles.inputRowSm}>
                <Ionicons name="person-outline" size={16} color={UI.muted} />
                <TextInput value={people} onChangeText={setPeople} keyboardType="number-pad" style={styles.inputSm} />
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{lang === "sq" ? "Bakshish %" : "Tip %"}</Text>
              <View style={styles.inputRowSm}>
                <Ionicons name="pricetag-outline" size={16} color={UI.muted} />
                <TextInput value={tip} onChangeText={setTip} keyboardType="decimal-pad" style={styles.inputSm} />
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <Pressable style={styles.selector} onPress={() => setPicker("paid")}>
              <View style={styles.selectorHead}>
                <Ionicons name="wallet-outline" size={14} color={UI.muted} />
                <Text style={styles.selectorTop}>{lang === "sq" ? "Paguar në" : "Paid in"}</Text>
              </View>
              <Text style={styles.selectorCode}>{paidIn}</Text>
              <Text style={styles.selectorName}>{CURRENCY_NAMES[paidIn] ?? "—"}</Text>
            </Pressable>

            <Pressable
              style={styles.swapIcon}
              onPress={() => {
                setPaidIn(settleIn);
                setSettleIn(paidIn);
              }}
            >
              <Ionicons name="swap-horizontal" size={18} color={UI.card} />
            </Pressable>

            <Pressable style={styles.selector} onPress={() => setPicker("settle")}>
              <View style={styles.selectorHead}>
                <Ionicons name="flag-outline" size={14} color={UI.muted} />
                <Text style={styles.selectorTop}>{lang === "sq" ? "Ndaj në" : "Split in"}</Text>
              </View>
              <Text style={styles.selectorCode}>{settleIn}</Text>
              <Text style={styles.selectorName}>{CURRENCY_NAMES[settleIn] ?? "—"}</Text>
            </Pressable>
          </View>
        </View>

        <CurrencyPicker
          visible={picker !== null}
          onClose={() => setPicker(null)}
          currencies={currencies}
          value={picker === "paid" ? paidIn : settleIn}
          onPick={(c) => (picker === "paid" ? setPaidIn(c) : setSettleIn(c))}
          lang={lang}
        />
      </View>
    </ScrollView>
  );
}

function parseNum(s: string) {
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const styles = StyleSheet.create({
  top: { flex: 1 },

  titleRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  titleIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: UI.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.18)",
    alignItems: "center",
    justifyContent: "center"
  },

  title: { fontSize: 18, fontWeight: "900", color: UI.text },
  sub: { marginTop: 2, color: UI.muted, fontWeight: "700" },

  resultCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(37,99,235,0.06)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.15)",
    marginBottom: 12
  },
  resultLabel: { fontWeight: "900", color: UI.muted },
  resultValue: { marginTop: 8, fontSize: 34, fontWeight: "900", letterSpacing: -0.3, color: UI.text },
  smallRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  small: { fontSize: 12, color: UI.muted, fontWeight: "800" },

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

  sectionTitle: { fontSize: 15, fontWeight: "900", color: UI.text, marginBottom: 10 },

  label: { fontWeight: "900", color: UI.muted, marginTop: 10 },

  inputRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(15,23,42,0.02)"
  },
  input: { flex: 1, fontSize: 20, fontWeight: "900", color: UI.text },

  row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },

  inputRowSm: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(15,23,42,0.02)"
  },
  inputSm: { flex: 1, fontSize: 18, fontWeight: "900", color: UI.text },

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

  swapIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: UI.dark, alignItems: "center", justifyContent: "center" }
});