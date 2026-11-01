import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { C } from "./theme";

/*
  The R2 mark on its own: two pickles leaning in, green (you) + white (friend).
  Same geometry as the pair in PickleLogo.tsx, so keep them in sync.
  Use `tile` for the rounded app-icon square from the design.
*/

type Props = {
  size?: number;          // size of the mark itself
  tile?: boolean;         // draw it on the 72px-style rounded tile
  background?: string;    // colour behind the mark (used for the cut)
};

export default function PickleIcon({ size = 48, tile = false, background }: Props) {
  const bg = background ?? (tile ? C.surface : C.bg);
  const mark = (
    <Svg width={size} height={size} viewBox="0 0 38 38">
      <Rect x={7} y={4} width={13} height={30} rx={6.5} fill={C.accent} transform="rotate(18 13.5 19)" />
      <Rect
        x={18}
        y={4}
        width={13}
        height={30}
        rx={6.5}
        fill={C.cream}
        stroke={bg}
        strokeWidth={3}
        transform="rotate(-18 24.5 19)"
      />
    </Svg>
  );
  if (!tile) return mark;
  const box = size * 1.5;
  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: box * 0.25,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {mark}
    </View>
  );
}
