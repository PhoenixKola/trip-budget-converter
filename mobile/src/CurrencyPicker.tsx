import React from "react";
import { Modal, View, Text, TextInput, FlatList, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { CURRENCY_NAMES } from "./currencies";

type Props = {
  visible: boolean;
  onClose: () => void;
  currencies: string[];
  value: string;
  onPick: (code: string) => void;
};

export function CurrencyPicker({ visible, onClose, currencies, value, onPick }: Props) {
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    if (visible) setQ("");
  }, [visible]);

  const data = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return currencies;

    return currencies.filter((c) => {
      const name = (CURRENCY_NAMES[c] ?? "").toLowerCase();
      return c.toLowerCase().includes(query) || name.includes(query);
    });
  }, [q, currencies]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Text style={s.title}>Select currency</Text>
          <Pressable hitSlop={10} onPress={onClose}>
            <Text style={s.done}>Done</Text>
          </Pressable>
        </View>

        <View style={s.searchWrap}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search (e.g. eur, dollar, lek)"
            style={s.search}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        <FlatList
          data={data}
          keyExtractor={(x) => x}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const selected = item === value;
            return (
              <Pressable
                onPress={() => {
                  onPick(item);
                  onClose();
                }}
                style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.code}>{item}</Text>
                  <Text style={s.name}>{CURRENCY_NAMES[item] ?? "—"}</Text>
                </View>
                {selected ? <Text style={s.check}>✓</Text> : null}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={s.sep} />}
        />
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: { fontSize: 22, fontWeight: "900" },
  done: { fontSize: 16, fontWeight: "800" },

  searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  search: {
    borderWidth: 1,
    borderColor: "#e7e7e7",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 18
  },

  row: {
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center"
  },
  code: { fontSize: 20, fontWeight: "900" },
  name: { marginTop: 3, opacity: 0.65, fontSize: 15 },
  check: { fontSize: 18, fontWeight: "900" },
  sep: { height: 1, backgroundColor: "#f0f0f0" }
});