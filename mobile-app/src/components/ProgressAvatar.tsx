import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Avatar } from "./ui-kit";
import { C, F } from "./theme";

/*
  Avatar with a progress ring around it.
  The ring is a circle whose dash is as long as the whole circumference:
  strokeDashoffset hides the part that isn't done yet.
*/
export default function ProgressAvatar({
  name,
  label,
  progress,
  color,
  size = 30,
}: {
  name: string;      // used for the avatar initial
  label: string;     // shown underneath ("You", "Brine")
  progress: number;  // 0 → 1
  color: string;     // ring colour
  size?: number;     // avatar size, the ring goes around it
}) {
  const stroke = 3;
  const gap = 3;                                // space between avatar and ring
  const box = size + 2 * (gap + stroke);
  const r = (box - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));

  return (
    <View style={[s.wrap, { width: box + 12 }]}>
      <View style={{ width: box, height: box, alignItems: "center", justifyContent: "center" }}>
        {/* rotated -90° so the ring starts at the top */}
        <Svg width={box} height={box} style={[StyleSheet.absoluteFill, { transform: [{ rotate: "-90deg" }] }]}>
          <Circle cx={box / 2} cy={box / 2} r={r} stroke={C.surface2} strokeWidth={stroke} fill="none" />
          {p > 0 && (
            <Circle
              cx={box / 2}
              cy={box / 2}
              r={r}
              stroke={color}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - p)}
            />
          )}
        </Svg>
        <Avatar name={name} size={size} color={color} />
      </View>
      <Text style={[s.label, p >= 1 && { color: C.cream }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: "center", gap: 4 },
  label: { fontFamily: F.text, fontSize: 11, color: C.muted, textAlign: "center" },
});