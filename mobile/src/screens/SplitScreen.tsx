import React from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import type { Lang } from "../i18n";
import { convert } from "../fx";
import { formatMoney } from "../format";
import { CurrencyPicker } from "../CurrencyPicker";
import { CURRENCY_NAMES } from "../currencies";

export default function SplitScreen(props: { lang: Lang; fx: any; currencies: string[] }) {
  const { lang, fx, currencies } = props;

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
    totalWithTip === null
      ? null
      : paidIn === settleIn
      ? totalWithTip
      : convert(totalWithTip, paidIn, settleIn, fx.rates);

  const perPerson =
    totalInSettle === null ? null : totalInSettle / peopleN;

  const title = lang === "sq" ? "Ndarja e faturës" : "Split costs";
  const hint = lang === "sq" ? "Opsionale: edhe me bakshish" : "Optional: include tip";

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{hint}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{lang === "sq" ? "Totali" : "Total"}</Text>
        <TextInput value={total} onChangeText={setTotal} keyboardType="decimal-pad" style={styles.input} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{lang === "sq" ? "Persona" : "People"}</Text>
            <TextInput value={people} onChangeText={setPeople} keyboardType="number-pad" style={styles.inputSm} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{lang === "sq" ? "Bakshish %" : "Tip %"}</Text>
            <TextInput value={tip} onChangeText={setTip} keyboardType="decimal-pad" style={styles.inputSm} />
          </View>
        </View>

        <View style={styles.row}>
          <Pressable style={styles.selector} onPress={() => setPicker("paid")}>
            <Text style={styles.selectorTop}>{lang === "sq" ? "Paguar në" : "Paid in"}</Text>
            <Text style={styles.selectorCode}>{paidIn}</Text>
            <Text style={styles.selectorName}>{CURRENCY_NAMES[paidIn] ?? "—"}</Text>
          </Pressable>

          <Pressable style={styles.swapIcon} onPress={() => { setPaidIn(settleIn); setSettleIn(paidIn); }}>
            <Text style={styles.swapIconTxt}>⇄</Text>
          </Pressable>

          <Pressable style={styles.selector} onPress={() => setPicker("settle")}>
            <Text style={styles.selectorTop}>{lang === "sq" ? "Ndaj në" : "Split in"}</Text>
            <Text style={styles.selectorCode}>{settleIn}</Text>
            <Text style={styles.selectorName}>{CURRENCY_NAMES[settleIn] ?? "—"}</Text>
          </Pressable>
        </View>

        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>{lang === "sq" ? "Për person" : "Per person"}</Text>
          <Text style={styles.result}>
            {perPerson === null || !isFinite(perPerson) ? "—" : formatMoney(perPerson, settleIn, lang)}
          </Text>

          {totalInSettle !== null ? (
            <Text style={styles.small}>
              {lang === "sq" ? "Totali (me bakshish)" : "Total (with tip)"}: {formatMoney(totalInSettle, settleIn, lang)}
            </Text>
          ) : null}
        </View>
      </View>

      <CurrencyPicker
        visible={picker !== null}
        onClose={() => setPicker(null)}
        currencies={currencies}
        value={picker === "paid" ? paidIn : settleIn}
        onPick={(c) => (picker === "paid" ? setPaidIn(c) : setSettleIn(c))}
      />
    </View>
  );
}

function parseNum(s: string) {
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 8, paddingTop: 6 },

  title: { fontSize: 18, fontWeight: "900" },
  sub: { opacity: 0.65, marginTop: 2 },

  card: {
    marginTop: 10,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    gap: 12
  },

  label: { fontWeight: "800", opacity: 0.7 },

  input: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 20,
    fontWeight: "800"
  },

  inputSm: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
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

  swapIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  swapIconTxt: { color: "#fff", fontSize: 18, fontWeight: "900" },

  resultBox: { marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  resultLabel: { fontWeight: "800", opacity: 0.6 },
  result: { marginTop: 6, fontSize: 34, fontWeight: "900", letterSpacing: -0.3 },
  small: { marginTop: 8, fontSize: 12, opacity: 0.65 }
});