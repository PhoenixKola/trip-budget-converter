import React from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FONTS, RADIUS, useTheme } from "../theme";

export type TabDef<T extends string> = {
  key: T;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconActive: React.ComponentProps<typeof Ionicons>["name"];
};

const PAD = 6;

/** Floating glass pill navigation with a sliding active indicator. */
export function TabBar<T extends string>({
  tabs,
  active,
  onChange
}: {
  tabs: TabDef<T>[];
  active: T;
  onChange: (t: T) => void;
}) {
  const { palette, isDark } = useTheme();
  const [width, setWidth] = React.useState(0);
  const indicatorX = React.useRef(new Animated.Value(0)).current;

  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === active));
  const segW = width > 0 ? (width - PAD * 2) / tabs.length : 0;

  React.useEffect(() => {
    if (!segW) return;
    Animated.spring(indicatorX, {
      toValue: PAD + activeIndex * segW,
      useNativeDriver: true,
      speed: 18,
      bounciness: 7
    }).start();
  }, [activeIndex, segW, indicatorX]);

  return (
    <View
      style={[
        styles.shell,
        {
          borderColor: palette.borderStrong,
          shadowColor: palette.shadow,
          backgroundColor: isDark ? "rgba(15, 22, 38, 0.55)" : "rgba(255, 255, 255, 0.55)"
        }
      ]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <BlurView
        intensity={45}
        tint={palette.blurTint}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />

      {segW > 0 ? (
        <Animated.View
          style={[
            styles.indicator,
            {
              width: segW,
              backgroundColor: palette.accent,
              transform: [{ translateX: indicatorX }]
            }
          ]}
        />
      ) : null}

      <View style={styles.row}>
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              style={styles.tab}
              onPress={() => {
                if (isActive) return;
                Haptics.selectionAsync().catch(() => {});
                onChange(tab.key);
              }}
            >
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={17}
                color={isActive ? palette.onAccent : palette.muted}
              />
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: isActive ? FONTS.bodyBold : FONTS.bodyMed,
                  fontSize: 12,
                  color: isActive ? palette.onAccent : palette.muted
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    overflow: "hidden",
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8
  },
  row: { flexDirection: "row", padding: PAD },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: RADIUS.pill
  },
  indicator: {
    position: "absolute",
    top: PAD,
    bottom: PAD,
    left: 0,
    borderRadius: RADIUS.pill
  }
});
