import { View, Text, Pressable, StyleSheet } from "react-native";
import { Avatar, Button, NavBar, Screen } from "../ui-kit";
import { C, F } from "../theme";
import { GENRES, Genre } from "../../lib/tmdb";

// 04 Genre picker: host picks, guest watches live
export default function GenreScreen({
  isHost,
  hostName,
  friendName,
  playerNames,
  selected,
  loading,
  onBack,
  onSelect,
  onStart,
  solo,
}: {
  isHost: boolean;
  hostName: string;
  friendName: string;     // the other person
  playerNames: string[];  // host first
  selected: Genre | null;
  loading?: boolean;
  onBack: () => void;
  onSelect: (g: Genre) => void;
  onStart: () => void;
  solo?: boolean;
}) {
  const presence = (
    <View style={s.presence}>
      <View style={{ flexDirection: "row" }}>
        {playerNames.map((n, i) => (
          <View key={i} style={i > 0 ? { marginLeft: -6 } : null}>
            <Avatar name={n} size={22} color={i === 0 ? C.accent : C.cream} ring={i > 0 ? C.surface : undefined} />
          </View>
        ))}
      </View>
      <Text style={s.presenceText}>{playerNames.length} in room</Text>
    </View>
  );

  let button;
  if (!isHost) button = <Button label={`Waiting for ${hostName}…`} kind="disabled" />;
  else if (loading) button = <Button label="Finding movies…" kind="disabled" />;
  else if (!selected) button = <Button label="Pick a genre" kind="disabled" />;
  else button = <Button label={`Start swiping · ${selected.title}`} onPress={onStart} />;

  return (
    <Screen>
      <NavBar onBack={onBack} center={solo ? undefined : presence} />
      <View style={s.body}>
        <View style={{ gap: 8 }}>
          <Text style={s.title}>What are we in the mood for?</Text>
          <Text style={s.sub}>
            {solo
              ? "Pick what you're in the mood for."
              : isHost
              ? `${friendName} sees your pick as you choose.`
              : `${hostName} is picking. You'll see it here.`}
          </Text>
        </View>

        <View style={s.chips}>
          {GENRES.map((g) => {
            const on = selected?.id === g.id;
            return (
              <Pressable
                key={g.id}
                disabled={!isHost || loading}
                onPress={() => onSelect(g)}
                style={[s.chip, on && s.chipOn]}
              >
                <Text style={[s.chipText, on && { color: C.bg }]}>{g.title}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />
        {button}
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
  body: { flex: 1, paddingTop: 12, paddingHorizontal: 24, paddingBottom: 36, gap: 24 },
  title: { fontFamily: F.displayBold, fontSize: 28, lineHeight: 30.8, letterSpacing: -0.56, color: C.cream },
  sub: { fontFamily: F.text, fontSize: 15, color: C.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.chipLine,
    justifyContent: "center",
  },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontFamily: F.textSemi, fontSize: 16, color: C.cream },
});
