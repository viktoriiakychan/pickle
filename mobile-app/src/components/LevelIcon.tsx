import Svg, { Rect, Circle } from "react-native-svg";
import { C } from "./theme";
import type { Level } from "../lib/seen";

export default function LevelIcon({ level, size = 44 }: { level: Level; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {/* brine */}
      <Rect x={11} y={17} width={18} height={17} rx={4} fill={C.accent} opacity={0.18} />

      {/* the pickle */}
      {level === "casual" && (
        <Rect x={16} y={2} width={8} height={18} rx={4} fill={C.accent} transform="rotate(14 20 11)" />
      )}
      {level === "regular" && (
        <Rect x={16} y={15} width={8} height={15} rx={4} fill={C.accent} transform="rotate(-12 20 22.5)" />
      )}
      {level === "nerd" && (
        <>
          <Rect x={12} y={27} width={16} height={7} rx={3.5} fill={C.accent} />
          <Circle cx={15} cy={21} r={1.3} fill={C.cream} opacity={0.7} />
          <Circle cx={24} cy={18.5} r={1} fill={C.cream} opacity={0.6} />
          <Circle cx={21} cy={23.5} r={0.8} fill={C.cream} opacity={0.5} />
        </>
      )}

      {/* jar (drawn last so the rim sits over the brine) */}
      <Rect x={9} y={10} width={22} height={26} rx={6} fill="none" stroke={C.cream} strokeWidth={2} />
      <Rect x={12} y={8} width={16} height={3} rx={1.5} fill={C.cream} />
    </Svg>
  );
}