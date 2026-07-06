import React from "react";
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CURRENCY_NAMES } from "./currencies";
import { flagFor, regionFor, regionLabel, REGION_ORDER, type Region } from "./flags";
import type { Lang } from "./i18n";
import { getJson, setJson } from "./storage";
import { FONTS, RADIUS, useTheme } from "./theme";
import { PressableScale } from "./ui";

type Props = {
  visible: boolean;
  onClose: () => void;
  currencies: string[];
  value: string;
  onPick: (code: string) => void;
  lang?: Lang;
};

const KEY_FAV = "currency_favorites_v1";
const KEY_RECENT = "currency_recent_v1";
const POPULAR = ["EUR", "ALL", "USD", "GBP"];

type ListEntry = { type: "header"; label: string } | { type: "row"; code: string };

export function CurrencyPicker({ visible, onClose, currencies, value, onPick, lang = "en" }: Props) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = React.useState("");
  const [fav, setFav] = React.useState<string[]>([]);
  const [recent, setRecent] = React.useState<string[]>([]);

  const sheetY = React.useRef(new Animated.Value(1)).current; // 1 hidden -> 0 shown

  React.useEffect(() => {
    (async () => {
      const f = await getJson<string[]>(KEY_FAV, []);
      const r = await getJson<string[]>(KEY_RECENT, []);
      setFav(Array.isArray(f) ? f : []);
      setRecent(Array.isArray(r) ? r : []);
    })();
  }, []);

  React.useEffect(() => {
    if (visible) setQ("");
    Animated.timing(sheetY, {
      toValue: visible ? 0 : 1,
      duration: visible ? 240 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [visible, sheetY]);

  React.useEffect(() => {
    setJson(KEY_FAV, fav).catch(() => {});
  }, [fav]);

  React.useEffect(() => {
    setJson(KEY_RECENT, recent).catch(() => {});
  }, [recent]);

  const title = lang === "sq" ? "Zgjidh monedhën" : "Choose currency";
  const ph = lang === "sq" ? "Kërko (p.sh. eur, dollar, lek)" : "Search (e.g. eur, dollar, lek)";

  const toggleFav = (code: string) => {
    Haptics.selectionAsync().catch(() => {});
    setFav((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [code, ...prev]));
  };

  const pick = (code: string) => {
    Haptics.selectionAsync().catch(() => {});
    onPick(code);
    setRecent((prev) => [code, ...prev.filter((x) => x !== code)].slice(0, 12));
    onClose();
  };

  const query = q.trim().toLowerCase();

  const entries = React.useMemo<ListEntry[]>(() => {
    if (query) {
      return currencies
        .filter((c) => {
          const name = (CURRENCY_NAMES[c] ?? "").toLowerCase();
          return c.toLowerCase().includes(query) || name.includes(query);
        })
        .map((code) => ({ type: "row" as const, code }));
    }

    const byRegion = new Map<Region, string[]>();
    for (const c of currencies) {
      const r = regionFor(c);
      byRegion.set(r, [...(byRegion.get(r) ?? []), c]);
    }

    const out: ListEntry[] = [];
    for (const region of REGION_ORDER) {
      const codes = byRegion.get(region);
      if (!codes?.length) continue;
      out.push({ type: "header", label: regionLabel(region, lang) });
      for (const code of codes) out.push({ type: "row", code });
    }
    return out;
  }, [query, currencies, lang]);

  const favData = fav.filter((c) => currencies.includes(c));
  const recentData = recent.filter((c) => currencies.includes(c) && !favData.includes(c)).slice(0, 6);
  const quickSets: { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; items: string[] }[] = [
    { label: lang === "sq" ? "Popullore" : "Popular", icon: "flame-outline", items: POPULAR.filter((c) => currencies.includes(c)) },
    { label: lang === "sq" ? "Të preferuara" : "Favorites", icon: "star-outline", items: favData },
    { label: lang === "sq" ? "Të fundit" : "Recent", icon: "time-outline", items: recentData }
  ];

  const translateY = sheetY.interpolate({ inputRange: [0, 1], outputRange: [0, 640] });
  const overlayOpacity = sheetY.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay, opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          s.sheet,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
            paddingBottom: insets.bottom + 8,
            transform: [{ translateY }]
          }
        ]}
      >
        <View style={[s.grabber, { backgroundColor: palette.faint }]} />

        <View style={s.header}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 20, color: palette.text }}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10} style={[s.closeBtn, { backgroundColor: palette.inputBg }]}>
            <Ionicons name="close" size={18} color={palette.text} />
          </Pressable>
        </View>

        <View style={[s.searchWrap, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Ionicons name="search" size={16} color={palette.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={ph}
            placeholderTextColor={palette.faint}
            style={[s.search, { color: palette.text }]}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {q ? (
            <Pressable onPress={() => setQ("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={palette.faint} />
            </Pressable>
          ) : null}
        </View>

        {!query ? (
          <View style={s.quickArea}>
            {quickSets
              .filter((qs) => qs.items.length)
              .map((qs) => (
                <View key={qs.label} style={{ marginTop: 10 }}>
                  <View style={s.sectionHeader}>
                    <Ionicons name={qs.icon} size={13} color={palette.muted} />
                    <Text style={{ fontFamily: FONTS.bodySemi, fontSize: 12, color: palette.muted }}>{qs.label}</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
                    {qs.items.map((c) => {
                      const active = c === value;
                      return (
                        <PressableScale key={c} onPress={() => pick(c)} scaleIn={0.95}>
                          <View
                            style={[
                              s.chip,
                              {
                                backgroundColor: active ? palette.accent : palette.card,
                                borderColor: active ? palette.accent : palette.border
                              }
                            ]}
                          >
                            <Text style={{ fontSize: 13 }}>{flagFor(c)}</Text>
                            <Text
                              style={{
                                fontFamily: FONTS.bodySemi,
                                fontSize: 13,
                                color: active ? palette.onAccent : palette.text
                              }}
                            >
                              {c}
                            </Text>
                          </View>
                        </PressableScale>
                      );
                    })}
                  </ScrollView>
                </View>
              ))}
          </View>
        ) : null}

        <FlatList
          data={entries}
          keyExtractor={(x, i) => (x.type === "row" ? x.code : `h-${x.label}-${i}`)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <Text
                  style={{
                    fontFamily: FONTS.bodySemi,
                    fontSize: 12,
                    color: palette.muted,
                    marginTop: 16,
                    marginBottom: 4,
                    marginLeft: 4,
                    textTransform: "uppercase",
                    letterSpacing: 0.6
                  }}
                >
                  {item.label}
                </Text>
              );
            }

            const code = item.code;
            const selected = code === value;
            const isFav = fav.includes(code);

            return (
              <PressableScale onPress={() => pick(code)} scaleIn={0.985}>
                <View
                  style={[
                    s.row,
                    {
                      backgroundColor: palette.card,
                      borderColor: selected ? palette.accent : palette.border
                    }
                  ]}
                >
                  <View style={[s.flagWrap, { backgroundColor: palette.inputBg }]}>
                    <Text style={{ fontSize: 20 }}>{flagFor(code)}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: FONTS.displaySemi, fontSize: 15, color: palette.text }}>{code}</Text>
                    <Text style={{ fontFamily: FONTS.bodyMed, fontSize: 12, color: palette.muted, marginTop: 2 }}>
                      {CURRENCY_NAMES[code] ?? "—"}
                    </Text>
                  </View>

                  <Pressable onPress={() => toggleFav(code)} hitSlop={8} style={s.starBtn}>
                    <Ionicons
                      name={isFav ? "star" : "star-outline"}
                      size={18}
                      color={isFav ? "#F59E0B" : palette.faint}
                    />
                  </Pressable>

                  {selected ? (
                    <View style={[s.checkPill, { backgroundColor: palette.accent }]}>
                      <Ionicons name="checkmark" size={15} color={palette.onAccent} />
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={17} color={palette.faint} />
                  )}
                </View>
              </PressableScale>
            );
          }}
        />
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "88%",
    borderTopLeftRadius: RADIUS.xl + 4,
    borderTopRightRadius: RADIUS.xl + 4,
    borderWidth: 1
  },

  grabber: {
    alignSelf: "center",
    marginTop: 10,
    width: 42,
    height: 5,
    borderRadius: RADIUS.pill,
    opacity: 0.5
  },

  header: {
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },

  searchWrap: {
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  search: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", padding: 0 },

  quickArea: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: RADIUS.pill,
    borderWidth: 1
  },

  list: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 4 },

  row: {
    marginTop: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },

  flagWrap: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },

  starBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center"
  },

  checkPill: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  }
});
