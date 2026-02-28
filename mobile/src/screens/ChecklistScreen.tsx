import React from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { Lang } from "../i18n";
import { getJson, setJson } from "../storage";

type Item = { id: string; label: string; done: boolean };

const KEY = "trip_checklist_v1";
const NOTES_KEY = "trip_notes_v2_lines";
const NOTE_DRAFT_KEY = "trip_notes_v2_draft";

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

function itemIcon(id: string) {
  switch (id) {
    case "passport":
      return { name: "passport", lib: "mci" as const };
    case "charger":
      return { name: "cellphone-charging", lib: "mci" as const };
    case "adapter":
      return { name: "power-plug", lib: "mci" as const };
    case "meds":
      return { name: "medical-bag", lib: "mci" as const };
    case "insurance":
      return { name: "shield-check", lib: "mci" as const };
    case "tickets":
      return { name: "ticket-confirmation", lib: "mci" as const };
    default:
      return { name: "checkmark-circle-outline", lib: "ion" as const };
  }
}

export default function ChecklistScreen({ lang, bottomPad }: { lang: Lang; bottomPad?: number }) {
  const pad = bottomPad ?? 120;

  const [items, setItems] = React.useState<Item[]>([]);
  const [noteDraft, setNoteDraft] = React.useState("");
  const [noteLines, setNoteLines] = React.useState<string[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  const noteRef = React.useRef<TextInput>(null);
  const PressableAny = require("react-native").Pressable;

  React.useEffect(() => {
    let alive = true;
    setHydrated(false);

    (async () => {
      const base = defaults(lang);

      const saved = await getJson<Item[]>(KEY, base);
      const savedNotes = await getJson<string[]>(NOTES_KEY, []);
      const savedDraft = await getJson<string>(NOTE_DRAFT_KEY, "");

      if (!alive) return;

      setItems(saved.length ? saved : base);
      setNoteLines(Array.isArray(savedNotes) ? savedNotes : []);
      setNoteDraft(typeof savedDraft === "string" ? savedDraft : "");
      setHydrated(true);
    })();

    return () => {
      alive = false;
    };
  }, [lang]);

  React.useEffect(() => {
    if (!hydrated) return;
    if (!items.length) return;
    setJson(KEY, items).catch(() => {});
  }, [items, hydrated]);

  React.useEffect(() => {
    if (!hydrated) return;
    setJson(NOTES_KEY, noteLines).catch(() => {});
  }, [noteLines, hydrated]);

  React.useEffect(() => {
    if (!hydrated) return;
    setJson(NOTE_DRAFT_KEY, noteDraft).catch(() => {});
  }, [noteDraft, hydrated]);

  function toggle(id: string) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  }

  function reset() {
    const nextItems = defaults(lang);
    setItems(nextItems);
    setNoteDraft("");
    setNoteLines([]);
    setJson(KEY, nextItems).catch(() => {});
    setJson(NOTES_KEY, []).catch(() => {});
    setJson(NOTE_DRAFT_KEY, "").catch(() => {});
  }

  async function addNoteLine() {
    const v = noteDraft.trim();
    if (!v) return;

    setNoteDraft("");

    setNoteLines((prev) => {
      const next = [v, ...prev];
      setJson(NOTES_KEY, next).catch(() => {});
      return next;
    });
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
        onPress: () =>
          setNoteLines((prev) => {
            const next = prev.filter((_, i) => i !== idx);
            setJson(NOTES_KEY, next).catch(() => {});
            return next;
          })
      }
    ]);
  }

  const title = lang === "sq" ? "Lista e udhëtimit" : "Travel checklist";
  const notesLabel = lang === "sq" ? "Shënime" : "Notes";
  const resetLabel = lang === "sq" ? "Rivendos" : "Reset";
  const addPlaceholder = lang === "sq" ? "Shto shënim dhe shtyp Enter…" : "Type a note and press Enter…";
  const hint = lang === "sq" ? "Shtyp mbi një shënim për ta fshirë." : "Tap a note to delete it.";
  const emptyTitle = lang === "sq" ? "S’ke shënime ende" : "No notes yet";
  const emptySub = lang === "sq" ? "Shto një shënim të shpejtë për udhëtimin." : "Add a quick note for your trip.";
  const emptyCta = lang === "sq" ? "Shto shënimin e parë" : "Add first note";

  const doneCount = items.filter((x) => x.done).length;
  const total = items.length || 1;
  const pct = Math.round((doneCount / total) * 100);

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.progressPill}>
            <Ionicons name="checkmark-done" size={14} color={UI.accent} />
            <Text style={styles.progressTxt}>
              {doneCount}/{items.length} • {pct}%
            </Text>
          </View>
        </View>

        <PressableAny onPress={reset} style={styles.resetBtn} hitSlop={10}>
          <Ionicons name="refresh" size={16} color={UI.dark} />
          <Text style={styles.resetTxt}>{resetLabel}</Text>
        </PressableAny>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: pad }}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Ionicons name="checkbox-outline" size={18} color={UI.accent} />
            </View>
            <Text style={styles.cardTitle}>{lang === "sq" ? "Gjërat kryesore" : "Essentials"}</Text>
          </View>

          {items.map((it) => {
            const ic = itemIcon(it.id);
            const IconComp: any = ic.lib === "mci" ? MaterialCommunityIcons : Ionicons;

            return (
              <PressableAny key={it.id} onPress={() => toggle(it.id)} style={styles.itemRow}>
                <View style={[styles.itemIconWrap, it.done ? styles.itemIconWrapOn : null]}>
                  <IconComp name={ic.name} size={18} color={it.done ? UI.card : UI.muted} />
                </View>

                <Text style={[styles.itemTxt, it.done ? styles.itemDone : null]}>{it.label}</Text>

                <View style={styles.rightCheck}>
                  <Ionicons
                    name={it.done ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                    color={it.done ? UI.accent : "rgba(15,23,42,0.25)"}
                  />
                </View>
              </PressableAny>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Ionicons name="document-text-outline" size={18} color={UI.accent} />
            </View>
            <Text style={styles.cardTitle}>{notesLabel}</Text>
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="create-outline" size={16} color={UI.muted} />
            <TextInput
              ref={noteRef}
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder={addPlaceholder}
              style={styles.noteInput}
              returnKeyType="done"
              blurOnSubmit={false}
              onSubmitEditing={addNoteLine}
            />
            <PressableAny onPress={addNoteLine} style={styles.addBtn} hitSlop={10}>
              <Ionicons name="add" size={18} color={UI.card} />
            </PressableAny>
          </View>

          {!noteLines.length ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Ionicons name="sparkles-outline" size={18} color={UI.accent} />
              </View>
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              <Text style={styles.emptySub}>{emptySub}</Text>

              <PressableAny onPress={() => noteRef.current?.focus()} style={styles.emptyBtn} hitSlop={10}>
                <Ionicons name="add-circle-outline" size={18} color={UI.card} />
                <Text style={styles.emptyBtnTxt}>{emptyCta}</Text>
              </PressableAny>
            </View>
          ) : (
            <>
              <View style={styles.hintRow}>
                <Ionicons name="information-circle-outline" size={14} color={UI.muted} />
                <Text style={styles.hint}>{hint}</Text>
              </View>

              <View style={{ marginTop: 6 }}>
                {noteLines.map((n, idx) => (
                  <PressableAny key={`${idx}-${n}`} onPress={() => removeNoteLine(idx)} style={styles.noteRow}>
                    <View style={styles.noteDot}>
                      <Ionicons name="bookmark-outline" size={14} color={UI.accent} />
                    </View>
                    <Text style={styles.noteTxt}>{n}</Text>
                    <Ionicons name="trash-outline" size={16} color="rgba(15,23,42,0.35)" />
                  </PressableAny>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, marginTop: 10 },

  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, gap: 12 },

  title: { fontSize: 18, fontWeight: "900", color: UI.text, marginBottom: 6 },

  progressPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: UI.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.18)"
  },
  progressTxt: { fontWeight: "900", color: UI.accent, fontSize: 12 },

  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: UI.border
  },
  resetTxt: { fontWeight: "900", fontSize: 12, color: UI.dark },

  card: {
    marginTop: 12,
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

  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: UI.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.18)"
  },
  cardTitle: { fontSize: 15, fontWeight: "900", color: UI.text },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(15,23,42,0.06)"
  },

  itemIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: "rgba(15,23,42,0.02)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  itemIconWrapOn: {
    backgroundColor: UI.accent,
    borderColor: "rgba(37,99,235,0.25)"
  },

  itemTxt: { flex: 1, fontSize: 15, fontWeight: "900", color: UI.text },
  itemDone: { opacity: 0.55, textDecorationLine: "line-through" },

  rightCheck: { marginLeft: 10 },

  inputWrap: {
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
  noteInput: { flex: 1, fontSize: 14, fontWeight: "800", color: UI.text },

  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: UI.dark,
    alignItems: "center",
    justifyContent: "center"
  },

  emptyBox: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: "rgba(15,23,42,0.02)",
    alignItems: "center"
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: UI.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.18)",
    alignItems: "center",
    justifyContent: "center"
  },
  emptyTitle: { marginTop: 10, fontWeight: "900", color: UI.text },
  emptySub: { marginTop: 6, color: UI.muted, fontWeight: "700", textAlign: "center" },
  emptyBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: UI.dark
  },
  emptyBtnTxt: { color: UI.card, fontWeight: "900" },

  hintRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  hint: { opacity: 0.85, fontSize: 12, fontWeight: "800", color: UI.muted },

  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(15,23,42,0.06)"
  },
  noteDot: {
    width: 30,
    height: 30,
    borderRadius: 14,
    backgroundColor: UI.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.18)",
    alignItems: "center",
    justifyContent: "center"
  },
  noteTxt: { flex: 1, fontSize: 14, fontWeight: "900", color: UI.text }
});