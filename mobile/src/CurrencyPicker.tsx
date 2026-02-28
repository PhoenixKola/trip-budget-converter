import React from "react";
import { Modal, View, Text, TextInput, FlatList, StyleSheet, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CURRENCY_NAMES } from "./currencies";
import type { Lang } from "./i18n";
import { getJson, setJson } from "./storage";

type Props = {
  visible: boolean;
  onClose: () => void;
  currencies: string[];
  value: string;
  onPick: (code: string) => void;
  lang?: Lang;
};

const UI = {
  bg: "#F6F7FB",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "rgba(15, 23, 42, 0.08)",
  shadow: "rgba(2, 6, 23, 0.10)",
  accent: "#2563EB",
  accentSoft: "rgba(37, 99, 235, 0.12)",
  dark: "#0B1220"
};

const KEY_FAV = "currency_favorites_v1";
const KEY_RECENT = "currency_recent_v1";
const POPULAR = ["EUR", "ALL", "USD", "GBP"];

export function CurrencyPicker({ visible, onClose, currencies, value, onPick, lang = "en" }: Props) {
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
    if (visible) {
      setQ("");
      Animated.timing(sheetY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(sheetY, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [visible, sheetY]);

  React.useEffect(() => {
    setJson(KEY_FAV, fav).catch(() => {});
  }, [fav]);

  React.useEffect(() => {
    setJson(KEY_RECENT, recent).catch(() => {});
  }, [recent]);

  const title = lang === "sq" ? "Zgjidh monedhën" : "Select currency";
  const done = lang === "sq" ? "Mbyll" : "Done";
  const ph = lang === "sq" ? "Kërko (p.sh. eur, dollar, lek)" : "Search (e.g. eur, dollar, lek)";

  const toggleFav = (code: string) => {
    setFav((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [code, ...prev]));
  };

  const pick = (code: string) => {
    onPick(code);

    setRecent((prev) => {
      const next = [code, ...prev.filter((x) => x !== code)];
      return next.slice(0, 12);
    });

    onClose();
  };

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return currencies;

    return currencies.filter((c) => {
      const name = (CURRENCY_NAMES[c] ?? "").toLowerCase();
      return c.toLowerCase().includes(query) || name.includes(query);
    });
  }, [q, currencies]);

  const showSections = !q.trim();
  const favData = fav.filter((c) => currencies.includes(c));
  const recentData = recent.filter((c) => currencies.includes(c) && !favData.includes(c));

  const translateY = sheetY.interpolate({ inputRange: [0, 1], outputRange: [0, 520] });
  const overlayOpacity = sheetY.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* overlay */}
      <AnimatedPressable onPress={onClose} style={[s.overlay, { opacity: overlayOpacity }]} />

      {/* sheet */}
      <Animated.View
        style={[
          s.sheet,
          {
            paddingBottom: insets.bottom + 12,
            transform: [{ translateY }]
          }
        ]}
      >
        <View style={s.grabber} />

        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.headerIcon}>
              <Ionicons name="cash-outline" size={18} color={UI.accent} />
            </View>
            <Text style={s.title}>{title}</Text>
          </View>

          <AnimatedPressable onPress={onClose} style={s.doneBtn} scaleIn={0.98}>
            <Ionicons name="close" size={18} color={UI.dark} />
            <Text style={s.doneTxt}>{done}</Text>
          </AnimatedPressable>
        </View>

        <View style={s.searchWrap}>
          <Ionicons name="search" size={16} color={UI.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={ph}
            style={s.search}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        {showSections ? (
          <>
            <SectionRow
              title={lang === "sq" ? "Popullore" : "Popular"}
              icon="flame-outline"
              items={POPULAR.filter((c) => currencies.includes(c))}
              value={value}
              onPick={pick}
            />

            {favData.length ? (
              <SectionRow
                title={lang === "sq" ? "Të preferuara" : "Favorites"}
                icon="star-outline"
                items={favData}
                value={value}
                onPick={pick}
              />
            ) : null}

            {recentData.length ? (
              <SectionRow
                title={lang === "sq" ? "Të fundit" : "Recent"}
                icon="time-outline"
                items={recentData}
                value={value}
                onPick={pick}
              />
            ) : null}

            <View style={s.sepWide} />
          </>
        ) : null}

        <FlatList
          data={filtered}
          keyExtractor={(x) => x}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const selected = item === value;
            const isFav = fav.includes(item);

            return (
              <Row
                code={item}
                name={CURRENCY_NAMES[item] ?? "—"}
                selected={selected}
                favorite={isFav}
                onPress={() => pick(item)}
                onToggleFav={() => toggleFav(item)}
              />
            );
          }}
        />
      </Animated.View>
    </Modal>
  );
}

function SectionRow({
  title,
  icon,
  items,
  value,
  onPick
}: {
  title: string;
  icon: any;
  items: string[];
  value: string;
  onPick: (c: string) => void;
}) {
  if (!items.length) return null;

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
      <View style={s.sectionHeader}>
        <Ionicons name={icon} size={14} color={UI.muted} />
        <Text style={s.sectionTitle}>{title}</Text>
      </View>

      <View style={s.chipRow}>
        {items.map((c) => (
          <AnimatedPressable
            key={c}
            onPress={() => onPick(c)}
            style={[s.chip, c === value ? s.chipActive : null]}
            scaleIn={0.97}
          >
            <Text style={[s.chipTxt, c === value ? s.chipTxtActive : null]}>{c}</Text>
          </AnimatedPressable>
        ))}
      </View>
    </View>
  );
}

function Row({
  code,
  name,
  selected,
  favorite,
  onPress,
  onToggleFav
}: {
  code: string;
  name: string;
  selected: boolean;
  favorite: boolean;
  onPress: () => void;
  onToggleFav: () => void;
}) {
  return (
    <AnimatedPressable onPress={onPress} style={s.row} scaleIn={0.985}>
      <View style={{ flex: 1 }}>
        <Text style={s.code}>{code}</Text>
        <Text style={s.name}>{name}</Text>
      </View>

      <AnimatedPressable onPress={onToggleFav} style={s.starBtn} scaleIn={0.92}>
        <Ionicons name={favorite ? "star" : "star-outline"} size={18} color={favorite ? UI.accent : "rgba(15,23,42,0.35)"} />
      </AnimatedPressable>

      {selected ? (
        <View style={s.checkPill}>
          <Ionicons name="checkmark" size={16} color={UI.card} />
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color="rgba(15,23,42,0.20)" />
      )}
    </AnimatedPressable>
  );
}

/** micro press-scale wrapper */
function AnimatedPressable({
  children,
  style,
  onPress,
  disabled,
  scaleIn = 0.96
}: {
  children?: React.ReactNode;
  style?: any;
  onPress?: () => void;
  disabled?: boolean;
  scaleIn?: number;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    if (disabled) return;
    Animated.timing(scale, { toValue: scaleIn, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };

  const pressOut = () => {
    Animated.timing(scale, { toValue: 1, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };

  const PressableAny = require("react-native").Pressable;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <PressableAny disabled={disabled} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
        {children}
      </PressableAny>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000" },

  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: UI.bg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: UI.shadow,
    shadowOpacity: 1,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: -12 },
    elevation: 10
  },

  grabber: {
    alignSelf: "center",
    marginTop: 10,
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.12)"
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },

  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: UI.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.18)",
    alignItems: "center",
    justifyContent: "center"
  },

  title: { fontSize: 18, fontWeight: "900", color: UI.text },

  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: UI.border
  },
  doneTxt: { fontSize: 13, fontWeight: "900", color: UI.dark },

  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.85)"
  },
  search: { flex: 1, fontSize: 15, fontWeight: "800", color: UI.text },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, marginTop: 6 },
  sectionTitle: { fontWeight: "900", color: UI.text, opacity: 0.85 },

  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: UI.border
  },
  chipActive: { backgroundColor: UI.accentSoft, borderColor: "rgba(37,99,235,0.25)" },
  chipTxt: { fontWeight: "900", color: UI.text },
  chipTxtActive: { color: UI.accent },

  sepWide: { height: 1, backgroundColor: "rgba(15,23,42,0.08)", marginTop: 14, marginHorizontal: 16 },

  list: { paddingHorizontal: 16, paddingBottom: 18 },

  row: {
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },

  code: { fontSize: 16, fontWeight: "900", color: UI.text },
  name: { marginTop: 3, color: UI.muted, fontSize: 13, fontWeight: "700" },

  starBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.04)",
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
    justifyContent: "center"
  },

  checkPill: {
    width: 32,
    height: 32,
    borderRadius: 14,
    backgroundColor: UI.accent,
    alignItems: "center",
    justifyContent: "center"
  }
});