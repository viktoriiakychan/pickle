import { ReactNode, useEffect, useId, useRef } from "react";
import { ArrowLeft, Star } from "lucide-react-native";
import {
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, MAX_WIDTH } from "./theme";

/* ── Screen: dark background, phone-width column, safe areas ───────── */
export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={s.root}>
      <View style={[s.column, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {children}
      </View>
    </View>
  );
}

/* ── Top bar: round back button, centred title, spacer ─────────────── */
export function NavBar({
  onBack,
  backLabel,
  center,
  right,
}: {
  onBack?: () => void;
  backLabel?: string;
  center?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <View style={s.nav}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={[s.back, !!backLabel && s.backWide]}
          accessibilityLabel={backLabel ?? "Back"}
          hitSlop={8}
        >
          <ArrowLeft size={backLabel ? 16 : 20} color={backLabel ? C.muted : C.cream} strokeWidth={2.4} />
          {!!backLabel && <Text style={s.backText}>{backLabel}</Text>}
        </Pressable>
      ) : (
        <View style={{ width: 40 }} />
      )}
      {typeof center === "string" ? <Text style={s.navTitle}>{center}</Text> : center}
      {right ?? <View style={{ width: 40 }} />}
    </View>
  );
}

/* ── Buttons ───────────────────────────────────────────────────────── */
type BtnKind = "primary" | "outline" | "light" | "disabled";

export function Button({
  label,
  onPress,
  kind = "primary",
  height = 56,
  fontSize = 17,
  style,
}: {
  label: ReactNode;
  onPress?: () => void;
  kind?: BtnKind;
  height?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const disabled = kind === "disabled";
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        { height },
        kind === "primary" && { backgroundColor: C.accent },
        kind === "light" && { backgroundColor: C.cream },
        kind === "outline" && s.btnOutline,
        kind === "disabled" && { backgroundColor: C.surface2 },
        pressed && !disabled && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      <Text
        style={[
          s.btnText,
          { fontSize },
          { color: kind === "outline" ? C.cream : kind === "disabled" ? C.faint : C.bg },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ── Round letter avatar ───────────────────────────────────────────── */
export function Avatar({
  name,
  size = 40,
  color = C.accent,
  ring,
}: {
  name: string;
  size?: number;
  color?: string;
  ring?: string; // 2px outline in this colour (used when avatars overlap)
}) {
  const ringW = ring ? 2 : 0;
  return (
    <View
      style={{
        width: size + ringW * 2,
        height: size + ringW * 2,
        margin: -ringW,
        borderRadius: 999,
        backgroundColor: color,
        borderWidth: ringW,
        borderColor: ring,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: F.textHeavy, fontSize: size >= 40 ? 16 : 11, color: C.bg }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/* "2009 · ★ 6.3 · 1h 34m" with an SVG star, so everything lines up */
export function MovieMeta({
  movie,
  runtime = true,
  extra,
  size = 13,
  color = C.muted,
}: {
  movie: { year?: string; rating?: string; runtime?: string };
  runtime?: boolean;
  extra?: string; // e.g. "3 of 4 said yes"
  size?: number;
  color?: string;
}) {
  const text = { fontFamily: F.textSemi, fontSize: size, lineHeight: size + 5, color };
  const parts: ReactNode[] = [];
  if (movie.year) parts.push(<Text key="y" style={text}>{movie.year}</Text>);
  if (movie.rating)
    parts.push(
      <View key="r" style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
        <Star size={size - 2} color={color} fill={color} strokeWidth={0} />
        <Text style={text}>{movie.rating}</Text>
      </View>
    );
  if (runtime && movie.runtime) parts.push(<Text key="t" style={text}>{movie.runtime}</Text>);
  if (extra) parts.push(<Text key="e" style={text}>{extra}</Text>);

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 6 }}>
      {parts.map((p, i) => [i > 0 && <Text key={`d${i}`} style={text}>·</Text>, p])}
    </View>
  );
}

/* ── Pulsing dashed circle for "waiting for player 2" ──────────────── */
export function PulseCircle() {
  const v = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.35, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View
      style={{
        width: 40,
        height: 40,
        borderRadius: 999,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: C.dashAvatar,
        opacity: v,
      }}
    />
  );
}

/* ── Diagonal stripes, the design's poster placeholder ─────────────── */
export function Stripes({
  a = C.stripeA,
  b = C.stripeB,
  band = 10,
}: {
  a?: string;
  b?: string;
  band?: number;
}) {
  const id = "st" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern
          id={id}
          patternUnits="userSpaceOnUse"
          width={band * 2}
          height={band * 2}
          patternTransform="rotate(45)"
        >
          <Rect x={0} y={0} width={band} height={band * 2} fill={a} />
          <Rect x={band} y={0} width={band} height={band * 2} fill={b} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  column: { flex: 1, width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center" },

  nav: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  backWide: {
    width: "auto",
    minWidth: 40,
    height: 32,          
    flexDirection: "row",
    gap: 4,
    paddingLeft: 10,
    paddingRight: 12,
  },
  backText: { fontFamily: F.textSemi, fontSize: 13, color: C.muted }, // system font arrow, like the design
  navTitle: { fontSize: 15, fontFamily: F.textSemi, color: C.muted },

  btn: { borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  btnOutline: { borderWidth: 1.5, borderColor: C.line, backgroundColor: "transparent" },
  btnText: { fontFamily: F.textBold },
});

/* ── Progress dots for multi-step flows (current one is a long pill) ── */
export function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: total }, (_, i) => {
        const on = i === step - 1;
        return (
          <View
            key={i}
            style={{ width: on ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: on ? C.accent : C.surface2 }}
          />
        );
      })}
    </View>
  );
}