import { View, Text, ScrollView, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Avatar, Button, NavBar, PulseCircle, Screen } from "../ui-kit";
import { C, F } from "../theme";
import { MAX_PLAYERS } from "../../lib/room";

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
  const ready = players.length >= 2;            // enough people to start
  const full = players.length >= MAX_PLAYERS;   // nobody else can join
  const host = players.find((p) => p.isHost);

  const ROW = 64;                                   // row height incl. padding
  const VISIBLE = 3;                                // rows shown before scrolling
  const rows = players.length + (full ? 0 : 1);    // + the "waiting" row
  const listHeight = VISIBLE * ROW + (VISIBLE - 1) * 10;

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

        <View style={{ gap: 10, flexShrink: 1 }}>
          <Text style={s.listLabel}>
            In the room · {players.length}/{MAX_PLAYERS}
          </Text>

        <View style={{ flexShrink: 1 }}>
          <ScrollView
            style={{ maxHeight: listHeight, flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ gap: 10 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {players.map((p) => (
              <View key={p.id} style={s.row}>
                <Avatar name={p.name} size={40} color={p.isHost ? C.accent : C.cream} />
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
                  <Text style={[s.name, { color: C.muted }]}>{ready ? "Room for more" : "Waiting for player 2…"}</Text>
                  <Text style={[s.role, { color: C.faint }]}>
                    {ready ? `Up to ${MAX_PLAYERS} people can join` : "They'll pop in here"}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* fade at the bottom so it's obvious there's more to scroll */}
          {rows > VISIBLE && (
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(13,17,13,0)", C.bg]}
              style={s.fade}
            />
          )}
        </View>
      </View>

        <View style={{ flex: 1 }} />
        {isHost ? (
          <Button label="Pick a genre" kind={ready ? "primary" : "disabled"} onPress={onContinue} />
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
  waitRow: { backgroundColor: "transparent", borderWidth: 1.5, borderStyle: "dashed", borderColor: C.chipLine },
  rowText: { flex: 1, gap: 2 },
  name: { fontFamily: F.textBold, fontSize: 16, color: C.cream },
  role: { fontFamily: F.text, fontSize: 13, color: C.muted },

  ready: { fontFamily: F.textSemi, fontSize: 13, color: C.accent },
  row: {
  height: 64,
  flexDirection: "row",
  alignItems: "center",
  gap: 14,
  paddingHorizontal: 14,
  borderRadius: 20,
  backgroundColor: C.surface,
  },
  listLabel: { fontFamily: F.textSemi, fontSize: 13, color: C.muted },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 40 },
  
});
