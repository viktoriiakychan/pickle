import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Button, NavBar, Screen, StepDots } from "../ui-kit";
import { C, F } from "../theme";
import { TASTE_STEPS } from "../../lib/tasteMovies";
import type { Level } from "../../lib/seen";
import LevelIcon from "../LevelIcon";

const LEVELS: { id: Level; title: string; sub: string }[] = [
  { id: "casual", title: "Just want something good", sub: "Big, popular crowd-pleasers." },
  { id: "regular", title: "I watch a lot", sub: "Great movies that aren't the obvious picks." },
  { id: "nerd", title: "Full film nerd", sub: "Hidden gems, classics and foreign films." },
];

// Taste 2: how mainstream or deep the deck should go
export default function LevelScreen({
  initial,
  editing,
  onBack,
  onDone,
  onSkip,
}: {
  initial: Level | null;
  editing?: boolean;
  onBack: () => void;
  onDone: (level: Level) => void;
  onSkip: () => void;
}) {
  const [level, setLevel] = useState<Level | null>(initial);

  return (
    <Screen>
      <NavBar
        onBack={onBack}
        center={<StepDots step={2} total={TASTE_STEPS} />}
        right={
          <Pressable onPress={onSkip} hitSlop={8}>
            <Text style={s.skip}>{editing ? "Cancel" : "Skip"}</Text>
          </Pressable>
        }
      />

      <View style={s.body}>
        <View style={{ gap: 8 }}>
          <Text style={s.title}>
            How deep do you <Text style={{ color: C.accent }}>go?</Text>
          </Text>
          <Text style={s.sub}>So we know whether to play it safe or dig for hidden gems.</Text>
        </View>

        <View style={{ gap: 12 }}>
          {LEVELS.map((l) => {
            const on = level === l.id;
            return (
              <Pressable
                key={l.id}
                onPress={() => setLevel(l.id)}
                style={({ pressed }) => [s.card, on && s.cardOn, pressed && { transform: [{ scale: 0.98 }] }]}
              >
                <LevelIcon level={l.id} size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.cardTitle}>{l.title}</Text>
                  <Text style={s.cardSub}>{l.sub}</Text>
                </View>
                <View style={[s.radio, on && s.radioOn]} />
              </Pressable>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />
        <Button
          label={level ? "Done" : "Pick one"}
          kind={level ? "primary" : "disabled"}
          onPress={() => level && onDone(level)}
        />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  skip: { fontFamily: F.textSemi, fontSize: 15, color: C.muted },
  body: { flex: 1, paddingTop: 12, paddingHorizontal: 24, paddingBottom: 36, gap: 24 },
  title: { fontFamily: F.displayBold, fontSize: 28, lineHeight: 30.8, letterSpacing: -0.56, color: C.cream },
  sub: { fontFamily: F.text, fontSize: 15, lineHeight: 21, color: C.muted },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 22,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  cardOn: { borderColor: C.accent, backgroundColor: C.pillGreen },
  emoji: { fontSize: 28 },
  cardTitle: { fontFamily: F.textBold, fontSize: 16, color: C.cream },
  cardSub: { fontFamily: F.text, fontSize: 13, lineHeight: 18, color: C.muted },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.chipLine },
  radioOn: { borderColor: C.accent, borderWidth: 7 }, // thick border = filled dot look
});