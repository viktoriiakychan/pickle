// Pickle design tokens, taken straight from the design export.
// Change a colour here and it changes everywhere.

export const C = {
  bg: "#0D110D",          // app background
  surface: "#161C16",     // cards, rows, back button
  surface2: "#232A22",    // disabled buttons, progress track
  pillGreen: "#1F2A14",   // genre pill on the swipe screen
  accent: "#B6F04A",      // pickle green
  cream: "#F3F6EE",       // main text, friend colour
  muted: "#A3AD9F",       // secondary text
  faint: "#7D8779",       // tertiary text, disabled label
  body: "#C9D0C5",        // movie overview text
  line: "rgba(243,246,238,0.22)",      // outline buttons
  chipLine: "rgba(243,246,238,0.18)",  // genre chips, dashed waiting row
  dashAvatar: "rgba(243,246,238,0.3)",
  stripeA: "#243020",     // poster placeholder stripes
  stripeB: "#1A211A",
};

// Font family names, registered in app/index.tsx with useFonts.
// "Display" = Bricolage cut at optical size 28 (big headings, like the design).
// "Text" = the regular Bricolage files from @expo-google-fonts (small text).
export const F = {
  text: "BricolageGrotesque_400Regular",
  textMedium: "BricolageGrotesque_500Medium",
  textSemi: "BricolageGrotesque_600SemiBold",
  textBold: "BricolageGrotesque_700Bold",
  textHeavy: "BricolageGrotesque_800ExtraBold",
  displayBold: "BricolageDisplay-Bold",
  displayHeavy: "BricolageDisplay-ExtraBold",
  mono: "JetBrainsMono_500Medium",
  monoBold: "JetBrainsMono_700Bold",
};

export const MAX_WIDTH = 430; // keeps the phone layout on desktop browsers
