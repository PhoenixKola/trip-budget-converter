import React from "react";
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, Alert } from "react-native";
import type { Lang } from "../i18n";
import { getJson, setJson } from "../storage";

type Item = { id: string; label: string; done: boolean };

const KEY = "trip_checklist_v1";
const NOTES_KEY = "trip_notes_v2_lines";

function defaults(lang: Lang): Item[] {
  if (lang === "sq") {
    return [
      { id: "passport", label: "Pasaportë / ID", done: false },
      { id: "charger", label: "Karikues", done: false },
      { id: "adapter", label: "Adaptor prizash", done: false },
      { id: "meds", label: "Ilaçe / vitaminat", done: false },
      { id: "insurance", label: "Sigurim udhëtimi", done: false },
      { id: "tickets", label: "Bileta / rezervime", done: false }
    ];
  }
  return [
    { id: "passport", label: "Passport / ID", done: false },
    { id: "charger", label: "Charger", done: false },
    { id: "adapter", label: "Power adapter", done: false },
    { id: "meds", label: "Meds", done: false },
    { id: "insurance", label: "Travel insurance", done: false },
    { id: "tickets", label: "Tickets / bookings", done: false }
  ];
}

export default function ChecklistScreen({ lang }: { lang: Lang }) {
  const [items, setItems] = React.useState<Item[]>([]);
  const [noteDraft, setNoteDraft] = React.useState("");
  const [noteLines, setNoteLines] = React.useState<string[]>([]);

  React.useEffect(() => {
    (async () => {
      const base = defaults(lang);
      const saved = await getJson<Item[]>(KEY, base);
      setItems(saved.length ? saved : base);

      const savedNotes = await getJson<string[]>(NOTES_KEY, []);
      setNoteLines(Array.isArray(savedNotes) ? savedNotes : []);
      setNoteDraft("");
    })();
  }, [lang]);

  React.useEffect(() => {
    if (!items.length) return;
    setJson(KEY, items).catch(() => {});
  }, [items]);

  React.useEffect(() => {
    setJson(NOTES_KEY, noteLines).catch(() => {});
  }, [noteLines]);

  function toggle(id: string) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  }

  function reset() {
    setItems(defaults(lang));
    setNoteDraft("");
    setNoteLines([]);
  }

  function addNoteLine() {
    const v = noteDraft.trim();
    if (!v) return;
    setNoteLines((prev) => [v, ...prev]);
    setNoteDraft("");
  }

  function removeNoteLine(idx: number) {
    const msg = lang === "sq" ? "Ta fshij këtë shënim?" : "Delete this note?";
    const ok = lang === "sq" ? "Fshij" : "Delete";
    const cancel = lang === "sq" ? "Anulo" : "Cancel";

    Alert.alert("", msg, [
      { text: cancel, style: "cancel" },
      {
        text: ok,
        style: "destructive",
        onPress: () => setNoteLines((prev) => prev.filter((_, i) => i !== idx))
      }
    ]);
  }

  const title = lang === "sq" ? "Lista e udhëtimit" : "Emergency pack";
  const notesLabel = lang === "sq" ? "Shënime" : "Notes";
  const resetLabel = lang === "sq" ? "Rivendos" : "Reset";
  const addPlaceholder = lang === "sq" ? "Shto shënim dhe shtyp Enter…" : "Type a note and press Enter…";
  const hint = lang === "sq" ? "Shtyp mbi një shënim për ta fshirë." : "Tap a note to delete it.";

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={reset} style={styles.resetBtn}>
          <Text style={styles.resetTxt}>{resetLabel}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {items.map((it) => (
            <Pressable key={it.id} onPress={() => toggle(it.id)} style={styles.itemRow}>
              <View style={[styles.box, it.done ? styles.boxOn : null]}>
                {it.done ? <Text style={styles.check}>✓</Text> : null}
              </View>
              <Text style={[styles.itemTxt, it.done ? styles.itemDone : null]}>{it.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{notesLabel}</Text>

          <TextInput
            value={noteDraft}
            onChangeText={setNoteDraft}
            placeholder={addPlaceholder}
            style={styles.noteInput}
            returnKeyType="done"
            blurOnSubmit={false}
            onSubmitEditing={addNoteLine}
          />

          {noteLines.length ? <Text style={styles.hint}>{hint}</Text> : null}

          <View style={{ marginTop: 10 }}>
            {noteLines.map((n, idx) => (
              <Pressable key={`${idx}-${n}`} onPress={() => removeNoteLine(idx)} style={styles.noteRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.noteTxt}>{n}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 10 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 6 },

  title: { fontSize: 18, fontWeight: "900" },

  resetBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "#f2f2f2" },
  resetTxt: { fontWeight: "900", fontSize: 12, opacity: 0.85 },

  card: {
    marginTop: 10,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f0f0f0"
  },

  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: "#ddd", alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: "#000", borderColor: "#000" },
  check: { color: "#fff", fontWeight: "900" },
  itemTxt: { fontSize: 15, fontWeight: "700" },
  itemDone: { opacity: 0.45, textDecorationLine: "line-through" },

  label: { fontWeight: "800", opacity: 0.7, marginBottom: 10 },

  noteInput: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14
  },

  hint: { marginTop: 8, opacity: 0.55, fontSize: 12, fontWeight: "700" },

  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10 },
  bullet: { fontSize: 16, lineHeight: 18, fontWeight: "900", opacity: 0.7, marginTop: 1 },
  noteTxt: { flex: 1, fontSize: 14, fontWeight: "700" }
});