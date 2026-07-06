import React from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FONTS, RADIUS, useTheme } from "./theme";

/** Pressable that scales down slightly while pressed. Optional light haptic tick. */
export function PressableScale({
  children,
  style,
  contentStyle,
  onPress,
  onLongPress,
  disabled,
  hitSlop,
  scaleIn = 0.96,
  haptic = false
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  hitSlop?: number;
  scaleIn?: number;
  haptic?: boolean;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    if (disabled) return;
    Animated.timing(scale, {
      toValue: scaleIn,
      duration: 90,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true
    }).start();
  };

  const pressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 130,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true
    }).start();
  };

  const handlePress = () => {
    if (disabled) return;
    if (haptic) Haptics.selectionAsync().catch(() => {});
    onPress?.();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress}
        disabled={disabled}
        hitSlop={hitSlop}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={contentStyle}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** Elevated surface card. */
export function Card({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: RADIUS.xl,
          padding: 18,
          backgroundColor: palette.card,
          borderWidth: 1,
          borderColor: palette.border,
          shadowColor: palette.shadow,
          shadowOpacity: 1,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 3
        },
        style
      ]}
    >
      {children}
    </View>
  );
}

/** Rounded icon container with soft accent background. */
export function IconBadge({
  name,
  size = 18,
  color,
  bg,
  box = 36
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  color?: string;
  bg?: string;
  box?: number;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: box * 0.4,
        backgroundColor: bg ?? palette.accentSoft,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Ionicons name={name} size={size} color={color ?? palette.accent} />
    </View>
  );
}

/** Small rounded metadata pill with optional icon. */
export function Pill({
  icon,
  label,
  tone = "neutral",
  style
}: {
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  tone?: "neutral" | "accent" | "success" | "danger";
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const colors = {
    neutral: { bg: palette.inputBg, fg: palette.muted },
    accent: { bg: palette.accentSoft, fg: palette.accent },
    success: { bg: palette.successSoft, fg: palette.success },
    danger: { bg: palette.dangerSoft, fg: palette.danger }
  }[tone];

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingVertical: 5,
          paddingHorizontal: 10,
          borderRadius: RADIUS.pill,
          backgroundColor: colors.bg
        },
        style
      ]}
    >
      {icon ? <Ionicons name={icon} size={13} color={colors.fg} /> : null}
      <Text style={{ color: colors.fg, fontSize: 12, fontFamily: FONTS.bodySemi }}>{label}</Text>
    </View>
  );
}

/** Selectable chip (quick currency, tip presets, segments). */
export function Chip({
  label,
  active,
  onPress,
  leading
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  leading?: React.ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <PressableScale onPress={onPress} scaleIn={0.95} haptic>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 9,
          paddingHorizontal: 14,
          borderRadius: RADIUS.pill,
          backgroundColor: active ? palette.accent : palette.card,
          borderWidth: 1,
          borderColor: active ? palette.accent : palette.border
        }}
      >
        {leading}
        <Text
          style={{
            fontFamily: FONTS.bodySemi,
            fontSize: 13,
            color: active ? palette.onAccent : palette.text
          }}
        >
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

/** Primary / ghost buttons. */
export function Button({
  label,
  icon,
  onPress,
  variant = "primary",
  disabled,
  style
}: {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  onPress?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const bg = variant === "primary" ? palette.accent : variant === "danger" ? palette.dangerSoft : palette.inputBg;
  const fg = variant === "primary" ? palette.onAccent : variant === "danger" ? palette.danger : palette.text;

  return (
    <PressableScale onPress={onPress} disabled={disabled} style={style} haptic>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 13,
          paddingHorizontal: 18,
          borderRadius: RADIUS.md,
          backgroundColor: bg,
          opacity: disabled ? 0.55 : 1
        }}
      >
        {icon ? <Ionicons name={icon} size={17} color={fg} /> : null}
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: fg }}>{label}</Text>
      </View>
    </PressableScale>
  );
}

/** Section header row: icon badge + title, optional right slot. */
export function SectionHeader({
  icon,
  title,
  right
}: {
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  right?: React.ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <View style={sh.row}>
      {icon ? <IconBadge name={icon} box={32} size={16} /> : null}
      <Text style={{ flex: 1, fontFamily: FONTS.displaySemi, fontSize: 15, color: palette.text }}>{title}</Text>
      {right}
    </View>
  );
}

const sh = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }
});

/** Horizontal segmented control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange
}: {
  options: { value: T; label: string; icon?: React.ComponentProps<typeof Ionicons>["name"] }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: palette.inputBg,
        borderRadius: RADIUS.md,
        padding: 4,
        gap: 4
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <PressableScale key={o.value} onPress={() => onChange(o.value)} style={{ flex: 1 }} scaleIn={0.97} haptic>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 9,
                borderRadius: RADIUS.md - 4,
                backgroundColor: active ? palette.card : "transparent",
                borderWidth: active ? 1 : 0,
                borderColor: palette.border
              }}
            >
              {o.icon ? <Ionicons name={o.icon} size={14} color={active ? palette.text : palette.muted} /> : null}
              <Text
                style={{
                  fontFamily: active ? FONTS.bodyBold : FONTS.bodyMed,
                  fontSize: 13,
                  color: active ? palette.text : palette.muted
                }}
              >
                {o.label}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}
