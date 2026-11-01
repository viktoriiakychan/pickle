import { View, Text, StyleSheet } from "react-native";
import { Avatar, Button, NavBar, PulseCircle, Screen } from "../ui-kit";
import { C, F } from "../theme";

export type LobbyPlayer = { id: string; name: string; isHost: boolean; isMe: boolean };

// 02 Lobby: host waits for player 2 (also shown to the guest once they join)
export default function LobbyScreen({
  code,
  players,
  isHost,
  copied,
  onBack,
  onCopy,
  onShare,
  onContinue,
}: {
  code: string;
  players: LobbyPlayer[];
  isHost: boolean;
  copied?: boolean;
  onBack: () => void;
  onCopy: () => void;
  onShare: () => void;
  onContinue: () => void;
}) {
  const full = players.length >= 2;
  const host = players.find((p) => p.isHost);

  return (
    <Screen>
      <NavBar onBack={onBack} center="Your room" />
      <View style={s.body}>
        <Text style={s.title}>
          {isHost ? "Send this code to your movie buddy" : `You're in! Waiting for ${host?.name ?? "the host"} to start`}
        </Text>

        <View style={s.codeCard}>
          <Text style={s.code}>{code}</Text>
          {isHost && (
            <View style={s.codeBtns}>
              <Button label={copied ? "Copied!" : "Copy code"} kind="light" height={48} fontSize={15} onPress={onCopy} style={{ flex: 1 }} />
              <Button label="Share link" kind="outline" height={48} fontSize={15} onPress={onShare} style={{ flex: 1 }} />
            </View>
          )}
        </View>

        <View style={{ gap: 12 }}>
          {players.map((p) => (
            <View key={p.id} style={s.row}>
              <Avatar name={p.name} color={p.isHost ? C.accent : C.cream} />
              <View style={s.rowText}>
                <Text style={s.name}>
                  {p.name}
                  {p.isMe ? " (you)" : ""}
                </Text>
                <Text style={s.role}>{p.isHost ? "Host" : "Guest"}</Text>
              </View>
              <Text style={s.ready}>Ready</Text>
            </View>
          ))}
          {!full && (
            <View style={[s.row, s.waitRow]}>
              <PulseCircle />
              <View style={s.rowText}>
                <Text style={[s.name, { color: C.muted }]}>Waiting for player 2…</Text>
                <Text style={[s.role, { color: C.faint }]}>They'll pop in here</Text>
              </View>
            </View>
          )}
        </View>

        <View style={{ flex: 1 }} />
        {isHost ? (
          <Button label="Pick a genre" kind={full ? "primary" : "disabled"} onPress={onContinue} />
        ) : (
          <Button label={`Waiting for ${host?.name ?? "host"}…`} kind="disabled" />
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { flex: 1, paddingTop: 12, paddingHorizontal: 28, paddingBottom: 36, gap: 28 },
  title: { fontFamily: F.displayBold, fontSize: 28, lineHeight: 30.8, letterSpacing: -0.56, color: C.cream },
  codeCard: {
    backgroundColor: C.surface,
    borderRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: "center",
    gap: 20,
  },
  code: { fontFamily: F.monoBold, fontSize: 44, letterSpacing: 3.52, color: C.accent },
  codeBtns: { flexDirection: "row", gap: 10, width: "100%" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: C.surface,
  },
  waitRow: { backgroundColor: "transparent", borderWidth: 1.5, borderStyle: "dashed", borderColor: C.chipLine },
  rowText: { flex: 1, gap: 2 },
  name: { fontFamily: F.textBold, fontSize: 16, color: C.cream },
  role: { fontFamily: F.text, fontSize: 13, color: C.muted },
  ready: { fontFamily: F.textSemi, fontSize: 13, color: C.accent },
});
