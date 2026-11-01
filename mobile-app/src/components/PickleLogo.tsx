import { View } from "react-native";
import Svg, { Path, G, Rect } from "react-native-svg";
import { C } from "./theme";

/*
  Pickle logo, direction R2 "Leaning in".
  The wordmark is real Bricolage Grotesque ExtraBold outlines (opsz 84,
  letter-spacing -0.05em, dotless i) converted to a path, so it looks the
  same on every device and never depends on a font loading.
  The two pickles sit where the i's dot would be: green (you) and white
  (your friend), with a thin cut where they overlap.

  Units are px at an 84px font size, origin = left edge on the baseline.
*/

const WORDMARK =
  "M3.35 12.7V-27.55V-44.35H15.14L15.17 -30.82L15.9 -30.79Q16.8 -35.71 18.66 -39Q20.52 -42.29 23.44 -43.91Q26.36 -45.53 30.46 -45.53Q35.76 -45.53 39.5 -42.85Q43.24 -40.18 45.19 -34.99Q47.14 -29.81 47.14 -22.27Q47.14 -14.35 45.02 -9.14Q42.9 -3.94 39.16 -1.38Q35.41 1.18 30.5 1.18Q26.68 1.18 23.78 -0.4Q20.89 -1.98 18.99 -5.23Q17.09 -8.48 16.25 -13.4H15.36Q15.79 -10.99 16.15 -8.39Q16.5 -5.8 16.72 -3.29Q16.94 -0.78 16.94 1.52V12.7ZM25.4 -9.92Q28.1 -9.92 29.86 -11.58Q31.62 -13.24 32.46 -15.97Q33.3 -18.71 33.3 -21.83Q33.3 -25.27 32.38 -28.01Q31.46 -30.76 29.69 -32.38Q27.91 -34.01 25.36 -34.01Q23.62 -34.01 22.06 -33.23Q20.51 -32.46 19.34 -30.94Q18.17 -29.42 17.48 -27.19Q16.8 -24.96 16.8 -21.97V-21.28Q16.8 -18.89 17.29 -17.08Q17.78 -15.26 18.62 -13.9Q19.46 -12.54 20.57 -11.65Q21.67 -10.76 22.9 -10.34Q24.13 -9.92 25.4 -9.92Z M48.29 0V-44.35H61.88V0Z M85.62 1.18Q79.69 1.18 75.4 -0.6Q71.1 -2.38 68.37 -5.54Q65.64 -8.7 64.34 -12.83Q63.04 -16.96 63.04 -21.66Q63.04 -26.46 64.34 -30.72Q65.64 -34.98 68.33 -38.35Q71.03 -41.72 75.28 -43.63Q79.52 -45.53 85.42 -45.53Q92.26 -45.53 96.54 -43.01Q100.82 -40.49 102.67 -36.44Q104.51 -32.39 104 -27.61L92.14 -26.21Q92.24 -29.2 91.4 -31.14Q90.55 -33.08 88.94 -34.03Q87.32 -34.97 85.09 -34.97Q83.06 -34.97 81.5 -34.2Q79.94 -33.43 78.89 -31.86Q77.83 -30.29 77.28 -27.93Q76.73 -25.57 76.73 -22.32Q76.73 -18.08 77.72 -15.07Q78.71 -12.05 80.72 -10.46Q82.73 -8.88 85.79 -8.88Q88.92 -8.88 90.55 -10.37Q92.18 -11.86 92.74 -14.12Q93.29 -16.38 93.02 -18.6L105.43 -17.71Q105.82 -14.1 104.9 -10.7Q103.99 -7.31 101.58 -4.61Q99.17 -1.92 95.21 -0.37Q91.26 1.18 85.62 1.18Z M105.91 0V-59.05H119.18V-27.56Q121.98 -29.11 124.05 -31.06Q126.12 -33 127.6 -35.22Q129.08 -37.44 130.05 -39.75Q131.02 -42.06 131.68 -44.35H147.28Q146.33 -41 144.58 -37.84Q142.82 -34.68 140.27 -31.95Q137.71 -29.22 134.32 -27.07Q130.93 -24.92 126.78 -23.6V-22.81Q132.12 -23.7 135.52 -23Q138.92 -22.3 140.92 -20.45Q142.91 -18.61 143.99 -15.9Q145.07 -13.19 145.69 -9.98L147.6 0H132.9L131.99 -6.92Q131.58 -9.82 130.91 -12.26Q130.25 -14.7 128.51 -16.19Q126.77 -17.69 123.11 -17.69H119.18V0Z M147.91 0V-59.04H161.47V0Z M185.04 1.18Q178.85 1.18 174.59 -0.58Q170.33 -2.34 167.66 -5.45Q164.99 -8.56 163.78 -12.61Q162.58 -16.67 162.58 -21.26Q162.58 -26.12 163.84 -30.5Q165.11 -34.88 167.72 -38.26Q170.34 -41.64 174.44 -43.58Q178.54 -45.53 184.19 -45.53Q189.84 -45.53 193.91 -43.59Q197.99 -41.65 200.46 -38.15Q202.93 -34.64 203.72 -29.99Q204.52 -25.34 203.66 -19.85L171.12 -19.38V-26.72L193.64 -27.12L191.44 -22.98Q191.95 -26.89 191.26 -29.54Q190.56 -32.18 188.82 -33.55Q187.08 -34.91 184.21 -34.91Q181.13 -34.91 179.22 -33.31Q177.31 -31.72 176.48 -28.8Q175.66 -25.88 175.66 -21.88Q175.66 -15.06 178.03 -11.95Q180.41 -8.84 185.1 -8.84Q187.15 -8.84 188.52 -9.37Q189.89 -9.89 190.75 -10.85Q191.6 -11.82 191.97 -13.18Q192.34 -14.53 192.31 -16.2L204.65 -15.25Q204.77 -12.43 203.87 -9.55Q202.97 -6.67 200.74 -4.25Q198.52 -1.84 194.67 -0.33Q190.82 1.18 185.04 1.18Z";

// drawing box (84px units)
const VB_TOP = -82;      // top of the pickle pair
const VB_BOTTOM = 13;    // bottom of the "p" descender
const VB_WIDTH = 206;
const VB_HEIGHT = VB_BOTTOM - VB_TOP;

// where the 38x38 pickle pair sits (measured from the design in a browser)
const PAIR_X = 34.02;
const PAIR_Y = -83;

// The design's text line box was 0.9em tall with the baseline 0.78em down.
// We size the component to that box so spacing around it matches the design;
// the pickles and the "p" tail hang outside it, exactly like the HTML did.
const LINE_HEIGHT_EM = 0.9;
const BASELINE_EM = 0.78;

type Props = {
  /** font size the wordmark is drawn at (76 on the landing screen) */
  size?: number;
  /** colour behind the logo, used for the thin cut between the pickles */
  background?: string;
  /** wordmark colour */
  color?: string;
};

export default function PickleLogo({ size = 76, background = C.bg, color = C.cream }: Props) {
  const s = size / 84;
  const width = VB_WIDTH * s;
  const height = VB_HEIGHT * s;
  const lineBox = size * LINE_HEIGHT_EM;
  const overflowTop = -VB_TOP * s - size * BASELINE_EM;
  const overflowBottom = height - overflowTop - lineBox;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="pickle"
      style={{ width, height, marginTop: -overflowTop, marginBottom: -overflowBottom }}
    >
      <Svg width={width} height={height} viewBox={`0 ${VB_TOP} ${VB_WIDTH} ${VB_HEIGHT}`}>
        <Path d={WORDMARK} fill={color} />
        <G transform={`translate(${PAIR_X} ${PAIR_Y})`}>
          <Rect x={7} y={4} width={13} height={30} rx={6.5} fill={C.accent} transform="rotate(18 13.5 19)" />
          <Rect
            x={18}
            y={4}
            width={13}
            height={30}
            rx={6.5}
            fill={color}
            stroke={background}
            strokeWidth={3}
            transform="rotate(-18 24.5 19)"
          />
        </G>
      </Svg>
    </View>
  );
}
