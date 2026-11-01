import { View, Text, StyleSheet } from "react-native";
import PickleLogo from "../PickleLogo";
import { Button, Screen } from "../ui-kit";
import { C, F } from "../theme";

// 01 Landing
export default function LandingScreen({
  onCreate,
  onJoin,
  creating,
}: {
  onCreate: () => void;
  onJoin: () => void;
  creating?: boolean;
}) {
  return (
    <Screen>
      <View style={s.body}>
        <View style={s.hero}>
          <PickleLogo size={76} />
          <View style={{ gap: 12 }}>
            <Text style={s.title}>
              In a pickle?{"\n"}
              <Text style={{ color: C.accent }}>Pick a flick.</Text>
            </Text>
            <Text style={s.sub}>Swipe with a friend. We'll show you what you both said yes to.</Text>
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <Button label={creating ? "Making your room…" : "Create a room"} onPress={onCreate} />
          <Button label="Join with a code" kind="outline" onPress={onJoin} />
        </View>
      </View>
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
  sub: { fontFamily: F.text, fontSize: 16, lineHeight: 23.2, color: C.muted, maxWidth: 260 },
});
