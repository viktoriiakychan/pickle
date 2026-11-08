import { useEffect, useState, type ReactNode } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Check, Shuffle, X } from "lucide-react-native";
import { Avatar, Button, NavBar, Screen } from "../ui-kit";
import { C, F } from "../theme";
import { GENRES } from "../../lib/tmdb";
import { Mood, MAX_GENRES } from "../../lib/room";

export type GenrePlayer = { id: string; name: string; isMe: boolean; isHost: boolean; mood: Mood };

const NO_RED = "#FF7A6B"; // "not tonight" colour
const titleOf = (id: string) => GENRES.find((g) => g.id === id)?.title ?? "";
const joinNames = (ns: string[]) =>
  ns.length <= 1 ? ns.join("") : `${ns.slice(0, -1).join(", ")} and ${ns[ns.length - 1]}`;

// 04 Genre picker: everyone picks up to 2 on their own phone and sees each other's picks live
export default function GenreScreen({
  players,
  solo,
  loading,
  onBack,
  onChange,
  onStart,
}: {
  players: GenrePlayer[]; // host first
  solo?: boolean;
  loading?: boolean;
  onBack: () => void;
  onChange: (mood: Mood) => void;
  onStart: () => void;
}) {
  const me = players.find((p) => p.isMe)!;
  const mine = me.mood;
  const others = players.filter((p) => !p.isMe);
  const host = players.find((p) => p.isHost);
  const [showNo, setShowNo] = useState(!!mine.no);

  const hasChoice = mine.genres.length > 0 || mine.any;
  const vetoes = players.filter((p) => p.mood.no).map((p) => ({ name: p.isMe ? "You" : p.name, genre: p.mood.no! }));
  const vetoed = new Set(vetoes.map((v) => v.genre));
  // the host never taps "I'm ready": pressing Start is their ready. They count as ready once they've picked.
  const isReady = (p: GenrePlayer) => (p.isHost ? p.mood.genres.length > 0 || p.mood.any : p.mood.ready);
  const notReady = players.filter((p) => !isReady(p));
  const anyoneChose = players.some((p) => p.mood.genres.length || p.mood.any);

  // someone said "not tonight" to a genre I picked → my pick is cancelled, I get a free slot and a heads-up
  const [notice, setNotice] = useState<string | null>(null);
  const othersNos = others.map((p) => p.mood.no ?? "").join(",");
  useEffect(() => {
    const lost = mine.genres.filter((g) => others.some((p) => p.mood.no === g));
    if (!lost.length) return;
    const by = others.find((p) => p.mood.no === lost[0])!.name;
    setNotice(`${by} said no to ${titleOf(lost[0])}, so it's been removed. Pick something else?`);
    onChange({ ...mine, genres: mine.genres.filter((g) => !lost.includes(g)), ready: false });
  }, [othersNos]);

  // any change to your picks means you're not "ready" any more
  const update = (patch: Partial<Mood>) => onChange({ ...mine, ...patch, ready: false });

  const toggle = (id: string) => {
    setNotice(null); // they've reacted to it
    if (mine.genres.includes(id)) update({ genres: mine.genres.filter((g) => g !== id) });
    else if (mine.genres.length < MAX_GENRES) update({ genres: [...mine.genres, id], any: false });
    else update({ genres: [...mine.genres.slice(0, MAX_GENRES - 1), id], any: false }); // already full: your first pick stays, the last one gets swapped
  };
  const toggleAny = () => update({ any: !mine.any, genres: [] });
  const setNo = (id: string | null) => update({ no: id, genres: mine.genres.filter((g) => g !== id) });

  /* -- bottom button ---------------------------------------------------- */
  let button;
  let below: ReactNode = null;
  if (loading) button = <Button label="Finding movies…" kind="disabled" />;
  else if (!hasChoice) button = <Button label={`Pick up to ${MAX_GENRES} genres`} kind="disabled" />;
  else if (solo) button = <Button label="Start swiping" onPress={onStart} />;
  else if (!me.isHost && !mine.ready) button = <Button label="I'm ready" onPress={() => onChange({ ...mine, ready: true })} />;
  else if (!me.isHost) button = <Button label={`Waiting for ${host?.name ?? "the host"} to start…`} kind="disabled" />;
  else if (notReady.length === 0) button = <Button label="Start swiping" onPress={onStart} />;
  else {
    button = <Button label={`Waiting for ${joinNames(notReady.map((p) => p.name))}…`} kind="disabled" />;
    if (anyoneChose)
      below = (
        <Pressable onPress={onStart} hitSlop={8} style={{ alignSelf: "center" }}>
          <Text style={s.link}>Start anyway</Text>
        </Pressable>
      );
  }

  const presence = (
    <View style={s.presence}>
      <View style={{ flexDirection: "row" }}>
        {players.map((p, i) => (
          <View key={p.id} style={i > 0 ? { marginLeft: -6 } : null}>
            <Avatar name={p.name} size={22} color={p.isMe ? C.accent : C.cream} ring={i > 0 ? C.surface : undefined} />
          </View>
        ))}
      </View>
      <Text style={s.presenceText}>{players.length} in room</Text>
    </View>
  );

  return (
    <Screen>
      <NavBar onBack={onBack} backLabel="Leave" center={solo ? undefined : presence} />

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 8 }}>
          <Text style={s.title}>What are we in the mood for?</Text>
          <Text style={s.sub}>
            {solo
              ? `Pick up to ${MAX_GENRES}. Two genres = movies that are both, as many as we can find.`
              : `Everyone picks up to ${MAX_GENRES}. You'll see each other's picks live.`}
          </Text>
        </View>

        {/* who's ready */}
        {!solo && (
          <View style={s.statusRow}>
            {players.map((p) => (
              <View key={p.id} style={[s.status, p.mood.ready && s.statusReady]}>
                <Avatar name={p.name} size={20} color={p.isMe ? C.accent : C.cream} />
                <Text style={s.statusText}>{p.isMe ? "You" : p.name}</Text>
                {isReady(p) ? (
                  <Check size={14} color={C.accent} strokeWidth={3} />
                ) : (
                  <Text style={s.statusWaiting}>picking…</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {!!notice && (
          <Pressable onPress={() => setNotice(null)} style={s.notice} accessibilityLabel="Dismiss">
            <Text style={s.noticeText}>{notice}</Text>
            <X size={14} color={NO_RED} strokeWidth={2.6} />
          </Pressable>
        )}

        {/* genres */}
        <View style={s.chips}>
          {GENRES.map((g) => {
            const on = mine.genres.includes(g.id);
            const blocked = vetoed.has(g.id);
            const friends = others.filter((p) => p.mood.genres.includes(g.id));
            return (
              <Pressable
                key={g.id}
                disabled={loading || blocked}
                onPress={() => toggle(g.id)}
                style={({ pressed }) => [s.chip, on && s.chipOn, blocked && s.chipBlocked, pressed && s.pressed]}
              >
                <Text style={[s.chipText, on && { color: C.bg }, blocked && s.struck]}>{g.title}</Text>
                {friends.length > 0 && !blocked && (
                  <View style={{ flexDirection: "row" }}>
                    {friends.map((p, i) => (
                      <View key={p.id} style={i > 0 ? { marginLeft: -6 } : null}>
                        <Avatar name={p.name} size={20} color={C.cream} ring={on ? C.accent : C.bg} />
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
          <Pressable
            disabled={loading}
            onPress={toggleAny}
            style={({ pressed }) => [s.chip, s.anyChip, mine.any && s.chipOn, pressed && s.pressed]}
          >
            <Shuffle size={15} color={mine.any ? C.bg : C.accent} strokeWidth={2.4} />
            <Text style={[s.chipText, { color: mine.any ? C.bg : C.accent }]}>Surprise me</Text>
            {others
              .filter((p) => p.mood.any)
              .map((p, i) => (
                <View key={p.id} style={i > 0 ? { marginLeft: -6 } : null}>
                  <Avatar name={p.name} size={20} color={C.cream} ring={mine.any ? C.accent : C.bg} />
                </View>
              ))}
          </Pressable>
        </View>

        {/* not tonight */}
        <View style={{ gap: 10 }}>
          {vetoes.length > 0 && (
            <Text style={s.vetoLine}>
              {vetoes.map((v) => `${v.name} said no to ${titleOf(v.genre)}`).join(" · ")}
            </Text>
          )}

          {showNo ? (
            <>
              <View style={s.noHeader}>
                <Text style={s.sectionLabel}>Not tonight (pick 1)</Text>
                <Pressable onPress={() => setShowNo(false)} hitSlop={10}>
                  <Text style={s.link}>Hide</Text>
                </Pressable>
              </View>
              <View style={s.chips}>
                {GENRES.map((g) => {
                  const on = mine.no === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      disabled={loading}
                      onPress={() => setNo(on ? null : g.id)}
                      style={({ pressed }) => [s.smallChip, on && s.noOn, pressed && s.pressed]}
                    >
                      <Text style={[s.smallChipText, on && { color: C.bg }]}>{g.title}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {!solo && <Text style={s.noHint}>Your "no" removes it for everyone, even if someone picked it.</Text>}
            </>
          ) : (
            <Pressable onPress={() => setShowNo(true)} hitSlop={8} style={{ alignSelf: "flex-start" }}>
              <Text style={s.link}>
                {mine.no ? `Change your "not tonight"` : "+ Something you're not in the mood for?"}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <View style={s.footer}>
        {button}
        {below}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  presence: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 32,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: C.surface,
  },
  presenceText: { fontFamily: F.textSemi, fontSize: 13, color: C.cream },
  body: { paddingTop: 12, paddingHorizontal: 24, paddingBottom: 24, gap: 22 },
  title: { fontFamily: F.displayBold, fontSize: 28, lineHeight: 30.8, letterSpacing: -0.56, color: C.cream },
  sub: { fontFamily: F.text, fontSize: 15, lineHeight: 21, color: C.muted },

  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: C.surface,
  },
  statusReady: { backgroundColor: C.pillGreen },
  statusText: { fontFamily: F.textSemi, fontSize: 13, color: C.cream },
  statusWaiting: { fontFamily: F.text, fontSize: 12, color: C.faint },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.chipLine,
  },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipBlocked: { opacity: 0.35 },
  anyChip: { borderStyle: "dashed", borderColor: C.accent },
  chipText: { fontFamily: F.textSemi, fontSize: 16, color: C.cream },
  struck: { textDecorationLine: "line-through" },
  pressed: { transform: [{ scale: 0.96 }] },

  noHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: { fontFamily: F.textBold, fontSize: 13, color: NO_RED },
  smallChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.chipLine,
    justifyContent: "center",
  },
  noOn: { backgroundColor: NO_RED, borderColor: NO_RED },
  smallChipText: { fontFamily: F.textSemi, fontSize: 13, color: C.muted },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,122,107,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,122,107,0.35)",
  },
  noticeText: { flex: 1, fontFamily: F.textSemi, fontSize: 13, lineHeight: 18, color: NO_RED },
  noHint: { fontFamily: F.text, fontSize: 12, color: C.faint },
  vetoLine: { fontFamily: F.textSemi, fontSize: 13, color: NO_RED },
  link: { fontFamily: F.textSemi, fontSize: 14, color: C.muted, textDecorationLine: "underline" },

  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 36, gap: 14 },
});