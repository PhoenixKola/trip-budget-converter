import React from "react";
import { ActivityIndicator, Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONTS, RADIUS, useTheme, type ThemeMode } from "../theme";
import { Button, Pill, SectionHeader, Segmented } from "../ui";
import type { Lang } from "../i18n";
import { t } from "../i18n";

type Props = {
  visible: boolean;
  onClose: () => void;
  lang: Lang;
  onLang: (l: Lang) => void;
  fxDate?: string;
  fromCache: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  refreshMsg?: string;
};

export function SettingsSheet({
  visible,
  onClose,
  lang,
  onLang,
  fxDate,
  fromCache,
  refreshing,
  onRefresh,
  refreshMsg
}: Props) {
  const { palette, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const anim = React.useRef(new Animated.Value(1)).current; // 1 hidden -> 0 shown

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 0 : 1,
      duration: visible ? 240 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [visible, anim]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 560] });
  const overlayOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay, opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY }]
          }
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: palette.faint }]} />

        <View style={styles.header}>
          <Text style={{ fontFamily: FONTS.display, fontSize: 20, color: palette.text }}>
            {t(lang, "settings")}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} style={[styles.closeBtn, { backgroundColor: palette.inputBg }]}>
            <Ionicons name="close" size={18} color={palette.text} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <SectionHeader icon="language-outline" title={t(lang, "language")} />
          <Segmented
            options={[
              { value: "en" as Lang, label: "English" },
              { value: "sq" as Lang, label: "Shqip" }
            ]}
            value={lang}
            onChange={onLang}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader icon="color-palette-outline" title={t(lang, "appearance")} />
          <Segmented
            options={[
              { value: "system" as ThemeMode, label: t(lang, "themeSystem"), icon: "phone-portrait-outline" },
              { value: "light" as ThemeMode, label: t(lang, "themeLight"), icon: "sunny-outline" },
              { value: "dark" as ThemeMode, label: t(lang, "themeDark"), icon: "moon-outline" }
            ]}
            value={mode}
            onChange={setMode}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader
            icon="stats-chart-outline"
            title={t(lang, "rates")}
            right={
              <Pill
                icon={fromCache ? "cloud-offline-outline" : "pulse-outline"}
                label={fromCache ? t(lang, "cached") : t(lang, "live")}
                tone={fromCache ? "neutral" : "success"}
              />
            }
          />

          <View style={[styles.ratesRow, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.bodyMed, fontSize: 12, color: palette.muted }}>
                {t(lang, "ratesDate")}
              </Text>
              <Text style={{ fontFamily: FONTS.displaySemi, fontSize: 16, color: palette.text, marginTop: 3 }}>
                {fxDate ?? "—"}
              </Text>
              <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: palette.faint, marginTop: 4 }}>
                ECB · Banka e Shqipërisë
              </Text>
            </View>

            {refreshing ? (
              <ActivityIndicator color={palette.accent} />
            ) : (
              <Button label={t(lang, "refresh")} icon="refresh" variant="ghost" onPress={onRefresh} />
            )}
          </View>

          {refreshMsg ? (
            <Text style={{ fontFamily: FONTS.bodyMed, fontSize: 12, color: palette.muted, marginTop: 8 }}>
              {refreshMsg}
            </Text>
          ) : null}
        </View>

        <Text style={{ fontFamily: FONTS.bodyMed, fontSize: 11, color: palette.faint, textAlign: "center", marginTop: 20 }}>
          Udhëto Shkurt · v1.0.6
        </Text>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: RADIUS.xl + 4,
    borderTopRightRadius: RADIUS.xl + 4,
    borderWidth: 1,
    paddingHorizontal: 20
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 4
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  section: { marginTop: 20 },
  ratesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 14
  }
});
