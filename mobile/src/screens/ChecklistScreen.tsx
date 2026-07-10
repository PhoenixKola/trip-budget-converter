import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { Lang } from "../i18n";
import { t } from "../i18n";
import { getJson, setJson } from "../storage";
import { FONTS, RADIUS, useTheme } from "../theme";
import { Card, PressableScale, SectionHeader } from "../ui";
import { ProgressRing } from "../components/Sparkline";

type Item = { id: string; label: string; done: boolean };

const KEY = "trip_checklist_v1";
const NOTES_KEY = "trip_notes_v2_lines";
const NOTE_DRAFT_KEY = "trip_notes_v2_draft";

const ITEM_LABELS: Record<string, { en: string; sq: string }> = {
  passport: { en: "Passport / ID", sq: "Pasaportë / ID" },
  charger: { en: "Charger", sq: "Karikues" },
  adapter: { en: "Power adapter", sq: "Adaptor prizash" },
  meds: { en: "Meds", sq: "Ilaçe / vitaminat" },
  insurance: { en: "Travel insurance", sq: "Sigurim udhëtimi" },
  tickets: { en: "Tickets / bookings", sq: "Bileta / rezervime" }
};

// Labels are resolved by id at render time; the stored label is only a
// fallback for items without an entry here.
function itemLabel(it: Item, lang: Lang): string {
  return ITEM_LABELS[it.id]?.[lang] ?? it.label;
}

function defaults(lang: Lang): Item[] {
  return Object.keys(ITEM_LABELS).map((id) => ({ id, label: ITEM_LABELS[id][lang], done: false }));
}

type Category = "documents" | "tech" | "health" | "other";

const CATEGORY_OF: Record<string, Category> = {
  passport: "documents",
  insurance: "documents",
  tickets: "documents",
  charger: "tech",
  adapter: "tech",
  meds: "health"
};

const CATEGORY_ORDER: Category[] = ["documents", "tech", "health", "other"];

function categoryLabel(cat: Category, lang: Lang): string {
  const labels: Record<Category, { en: string; sq: string }> = {
    documents: { en: "Documents", sq: "Dokumentet" },
    tech: { en: "Tech", sq: "Teknologji" },
    health: { en: "Health", sq: "Shëndeti" },
    other: { en: "Other", sq: "Të tjera" }
  };
  return labels[cat][lang];
}

function itemIcon(id: string): { name: any; lib: "mci" | "ion" } {
  switch (id) {
    case "passport":
      return { name: "passport", lib: "mci" };
    case "charger":
      return { name: "cellphone-charging", lib: "mci" };
    case "adapter":
      return { name: "power-plug", lib: "mci" };
    case "meds":
      return { name: "medical-bag", lib: "mci" };
    case "insurance":
      return { name: "shield-check", lib: "mci" };
    case "tickets":
      return { name: "ticket-confirmation", lib: "mci" };
    default:
      return { name: "checkmark-circle-outline", lib: "ion" };
  }
}

export default function ChecklistScreen({ lang, bottomPad }: { lang: Lang; bottomPad?: number }) {
  const { palette } = useTheme();
  const pad = bottomPad ?? 120;

  const [items, setItems] = React.useState<Item[]>([]);
  const [noteDraft, setNoteDraft] = React.useState("");
  const [noteLines, setNoteLines] = React.useState<string[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  const noteRef = React.useRef<TextInput>(null);

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
    if (!hydrated || !items.length) return;
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
    Haptics.selectionAsync().catch(() => {});
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

  function addNoteLine() {
    const v = noteDraft.trim();
    if (!v) return;
    Haptics.selectionAsync().catch(() => {});
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

  const doneCount = items.filter((x) => x.done).length;
  const total = items.length || 1;
  const pct = doneCount / total;

  const grouped = React.useMemo(() => {
    const map = new Map<Category, Item[]>();
    for (const it of items) {
      const cat = CATEGORY_OF[it.id] ?? "other";
      map.set(cat, [...(map.get(cat) ?? []), it]);
    }
    return CATEGORY_ORDER.filter((c) => map.get(c)?.length).map((c) => ({ cat: c, items: map.get(c)! }));
  }, [items]);

  const addPlaceholder = lang === "sq" ? "Shto shënim dhe shtyp Enter…" : "Type a note and press Enter…";
  const hint = lang === "sq" ? "Shtyp mbi një shënim për ta fshirë." : "Tap a note to delete it.";
  const emptyTitle = lang === "sq" ? "S’ke shënime ende" : "No notes yet";
  const emptySub = lang === "sq" ? "Shto një shënim të shpejtë për udhëtimin." : "Add a quick note for your trip.";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: pad, paddingTop: 6 }}
      style={{ flex: 1 }}
    >
      {/* ── Progress header ──────────────────────────────────── */}
      <Card style={styles.progressCard}>
        <ProgressRing size={62} strokeWidth={6} progress={pct} color={palette.accent} track={palette.inputBg}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 15, color: palette.text }}>
            {Math.round(pct * 100)}
            <Text style={{ fontSize: 10 }}>%</Text>
          </Text>
        </ProgressRing>

        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 17, color: palette.text }}>
            {lang === "sq" ? "Lista e udhëtimit" : "Travel checklist"}
          </Text>
          <Text style={{ fontFamily: FONTS.bodyMed, fontSize: 13, color: palette.muted, marginTop: 3 }}>
            {doneCount}/{items.length} {t(lang, "packed")}
          </Text>
        </View>

        <Pressable
          onPress={reset}
          hitSlop={8}
          style={[styles.resetBtn, { backgroundColor: palette.inputBg }]}
        >
          <Ionicons name="refresh" size={15} color={palette.muted} />
          <Text style={{ fontFamily: FONTS.bodySemi, fontSize: 12, color: palette.muted }}>{t(lang, "reset")}</Text>
        </Pressable>
      </Card>

      {/* ── Essentials by category ───────────────────────────── */}
      <Card style={{ marginTop: 14 }}>
        <SectionHeader icon="bag-check-outline" title={t(lang, "essentials")} />

        {grouped.map(({ cat, items: catItems }) => (
          <View key={cat}>
            <Text
              style={{
                fontFamily: FONTS.bodySemi,
                fontSize: 11,
                color: palette.faint,
                textTransform: "uppercase",
                letterSpacing: 0.7,
                marginTop: 12,
                marginBottom: 2
              }}
            >
              {categoryLabel(cat, lang)}
            </Text>

            {catItems.map((it) => {
              const ic = itemIcon(it.id);
              const IconComp: any = ic.lib === "mci" ? MaterialCommunityIcons : Ionicons;

              return (
                <PressableScale key={it.id} onPress={() => toggle(it.id)} scaleIn={0.985}>
                  <View style={[styles.itemRow, { borderTopColor: palette.border }]}>
                    <View
                      style={[
                        styles.itemIconWrap,
                        { backgroundColor: it.done ? palette.accent : palette.inputBg }
                      ]}
                    >
                      <IconComp name={ic.name} size={17} color={it.done ? palette.onAccent : palette.muted} />
                    </View>

                    <Text
                      style={[
                        { flex: 1, fontSize: 14.5, fontFamily: FONTS.bodySemi, color: palette.text },
                        it.done ? { opacity: 0.45, textDecorationLine: "line-through" } : null
                      ]}
                    >
                      {itemLabel(it, lang)}
                    </Text>

                    <Ionicons
                      name={it.done ? "checkmark-circle" : "ellipse-outline"}
                      size={22}
                      color={it.done ? palette.success : palette.faint}
                    />
                  </View>
                </PressableScale>
              );
            })}
          </View>
        ))}
      </Card>

      {/* ── Notes ────────────────────────────────────────────── */}
      <Card style={{ marginTop: 14 }}>
        <SectionHeader icon="document-text-outline" title={t(lang, "notes")} />

        <View style={[styles.inputWrap, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
          <Ionicons name="create-outline" size={16} color={palette.muted} />
          <TextInput
            ref={noteRef}
            value={noteDraft}
            onChangeText={setNoteDraft}
            placeholder={addPlaceholder}
            placeholderTextColor={palette.faint}
            style={[styles.noteInput, { color: palette.text }]}
            returnKeyType="done"
            blurOnSubmit={false}
            onSubmitEditing={addNoteLine}
          />
          <Pressable onPress={addNoteLine} hitSlop={8} style={[styles.addBtn, { backgroundColor: palette.accent }]}>
            <Ionicons name="add" size={18} color={palette.onAccent} />
          </Pressable>
        </View>

        {!noteLines.length ? (
          <View style={styles.emptyBox}>
            <View style={[styles.emptyIcon, { backgroundColor: palette.accentSoft }]}>
              <Ionicons name="sparkles-outline" size={18} color={palette.accent} />
            </View>
            <Text style={{ marginTop: 10, fontFamily: FONTS.displaySemi, fontSize: 14, color: palette.text }}>
              {emptyTitle}
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontFamily: FONTS.bodyMed,
                fontSize: 12,
                color: palette.muted,
                textAlign: "center"
              }}
            >
              {emptySub}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.hintRow}>
              <Ionicons name="information-circle-outline" size={13} color={palette.faint} />
              <Text style={{ fontSize: 11.5, fontFamily: FONTS.bodyMed, color: palette.faint }}>{hint}</Text>
            </View>

            {noteLines.map((n, idx) => (
              <Pressable key={`${idx}-${n}`} onPress={() => removeNoteLine(idx)}>
                <View style={[styles.noteRow, { borderTopColor: palette.border }]}>
                  <View style={[styles.noteDot, { backgroundColor: palette.accentSoft }]}>
                    <Ionicons name="bookmark-outline" size={13} color={palette.accent} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, fontFamily: FONTS.bodyMed, color: palette.text }}>{n}</Text>
                  <Ionicons name="trash-outline" size={16} color={palette.faint} />
                </View>
              </Pressable>
            ))}
          </>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },

  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderTopWidth: 1
  },

  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 13,
    paddingVertical: 8
  },
  noteInput: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", padding: 0 },

  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center"
  },

  emptyBox: { marginTop: 16, alignItems: "center", paddingBottom: 6 },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },

  hintRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },

  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderTopWidth: 1,
    marginTop: 4
  },
  noteDot: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  }
});
