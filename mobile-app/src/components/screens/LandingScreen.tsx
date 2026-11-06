import { View, Text, Pressable, StyleSheet } from "react-native";
import { Bookmark, Sparkles } from "lucide-react-native";
import PickleLogo from "../PickleLogo";
import { Button, Screen } from "../ui-kit";
import { C, F } from "../theme";

// 01 Landing
export default function LandingScreen({
  onCreate,
  onJoin,
  creating,
  onEditTaste,
  onSolo,
  onSaved,
}: {
  onCreate: () => void;
  onJoin: () => void;
  creating?: boolean;
  onEditTaste?: () => void;
  onSolo: () => void;
  onSaved?: () => void;
}) {
  return (
    <Screen>
      <View style={s.body}>
            <View style={s.top}>
            {onEditTaste && (
              <Pressable
                onPress={onEditTaste}
                hitSlop={8}
                accessibilityLabel="Your taste"
                style={({ pressed }) => [s.tasteBtn, pressed && { transform: [{ scale: 0.94 }] }]}
              >
              {onSaved && (
                <Pressable
                  onPress={onSaved}
                  hitSlop={8}
                  accessibilityLabel="Saved matches"
                  style={({ pressed }) => [s.tasteBtn, pressed && { transform: [{ scale: 0.94 }] }]}
                >
                  <Bookmark size={14} color={C.accent} strokeWidth={2.4} />
                  <Text style={s.tasteText}>Saved</Text>
                </Pressable>
              )}
                <Sparkles size={14} color={C.accent} strokeWidth={2.4} />
                <Text style={s.tasteText}>Your taste</Text>
              </Pressable>
            )}
          </View>
  
        <View style={s.hero}>
          <PickleLogo size={76} />
          <View style={{ gap: 12 }}>
            <Text style={s.title}>
              In a pickle?{"\n"}
              <Text style={{ color: C.accent }}>Swipe your way out.</Text>
            </Text>
            <Text style={s.sub}>Skip the endless scroll. Find tonight’s movie in a few swipes.  </Text>
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <Button label={creating ? "Making your room…" : "Create a room"} onPress={onCreate} />
          <Button label="Join with a code" kind="outline" onPress={onJoin} />
          <Pressable onPress={onSolo} disabled={creating} style={s.soloBtn} hitSlop={8}>
            <Text style={s.soloText}>
              or <Text style={{ color: C.cream, textDecorationLine: "underline" }}>swipe solo</Text>
            </Text>
          </Pressable>
        </View>
      </View>
      <Text style={s.credit}>Movie data from TMDB. Not endorsed or certified by TMDB.</Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 28, paddingBottom: 36 },
  hero: { flex: 1, justifyContent: "center", gap: 28 },
  title: {
    fontFamily: F.displayBold,
    fontSize: 30,
    lineHeight: 32.4,
    letterSpacing: -0.6,
    color: C.cream,
  },
  sub: { fontFamily: F.text, fontSize: 16, lineHeight: 23.2, color: C.muted, maxWidth: 320 },
  top: { flexDirection: "row", justifyContent: "flex-end", gap: 8, paddingTop: 12 },
  tasteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: C.surface,
  },
  tasteText: { fontFamily: F.textSemi, fontSize: 13, color: C.cream },
  soloBtn: { alignSelf: "center", paddingVertical: 6 },
  soloText: { fontFamily: F.textSemi, fontSize: 14, color: C.muted },
  credit: { fontFamily: F.textMedium, fontSize: 11, color: C.faint, textAlign: "center", marginTop: 8 },
});

