import { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Button, NavBar, Screen } from "../ui-kit";
import { C, F } from "../theme";

const LENGTH = 6;

// 03 Lobby: guest types a code
export default function JoinScreen({
  initialCode = "",
  error,
  joining,
  onBack,
  onJoin,
}: {
  initialCode?: string;
  error?: string | null;
  joining?: boolean;
  onBack: () => void;
  onJoin: (code: string) => void;
}) {
  const [code, setCode] = useState(initialCode.toUpperCase().slice(0, LENGTH));
  const [focused, setFocused] = useState(true);
  const input = useRef<any>(null); // TextInput ref (typed loosely so it works on any RN version)
  const complete = code.length === LENGTH;

  const onChange = (t: string) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, LENGTH));

  return (
    <Screen>
      <NavBar onBack={onBack} center="Join a room" />
      <View style={s.body}>
        <Text style={s.title}>Got a code?</Text>

        {/* six boxes on top of one invisible input */}
        <Pressable style={s.boxes} onPress={() => input.current?.focus()}>
          {Array.from({ length: LENGTH }, (_, i) => {
            const active = focused && i === Math.min(code.length, LENGTH - 1); // the box you type into next
            return (
              <View key={i} style={[s.box, active && { borderColor: C.cream }]}>
                <Text style={s.char}>{code[i] ?? ""}</Text>
              </View>
            );
          })}
          <TextInput
            ref={input}
            value={code}
            onChangeText={onChange}
            maxLength={LENGTH}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            autoFocus
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => complete && onJoin(code)}
            accessibilityLabel="Room code"
            caretHidden
            style={s.hiddenInput}
          />
        </Pressable>

        <Text style={[s.hint, error ? { color: C.cream } : null]}>
          {error ?? "It's on your friend's screen, 6 characters"}
        </Text>

        <View style={{ flex: 1 }} />
        <Button
          label={joining ? "Joining…" : "Join room"}
          kind={complete && !joining ? "primary" : "disabled"}
          onPress={() => onJoin(code)}
        />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { flex: 1, paddingTop: 12, paddingHorizontal: 28, paddingBottom: 36, gap: 28 },
  title: { fontFamily: F.displayBold, fontSize: 28, lineHeight: 30.8, letterSpacing: -0.56, color: C.cream },
  boxes: { flexDirection: "row", gap: 8, position: "relative" },
  box: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  char: { fontFamily: F.monoBold, fontSize: 24, color: C.cream },
  hiddenInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    fontSize: 16, // 16+ stops iOS Safari zooming in
    color: "transparent",
  },
  hint: { fontFamily: F.text, fontSize: 14, color: C.muted, marginTop: -14 },
});
