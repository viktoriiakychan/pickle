import { View, Text, Image, Pressable, ScrollView, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button, Screen, Stripes } from "../ui-kit";
import { C, F } from "../theme";
import { metaLine, Movie } from "../../lib/tmdb";

// 06 Results: shared matches
export default function ResultsScreen({
  genreTitle,
  names,
  matches,
  onNewGenre,
  onWhereToWatch,
  onLeave
}: {
  genreTitle: string;
  names: string[];          // host first
  matches: Movie[];         // best first
  onNewGenre: () => void;
  onWhereToWatch: (m: Movie) => void;
  onLeave: () => void;
}) {
  const [top, ...rest] = matches;
  const heading =
    matches.length === 0
      ? "No matches this time"
      : `You matched on ${matches.length} ${matches.length === 1 ? "movie" : "movies"}`;

  return (
    <Screen>
      <View style={s.body}>
        <View style={{ gap: 6 }}>
          <Text style={s.kicker}>
            {genreTitle} · {names.join(" + ")}
          </Text>
          <Text style={s.heading}>{heading}</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 22 }} showsVerticalScrollIndicator={false}>
          {top ? (
            <Pressable style={s.hero} onPress={() => onWhereToWatch(top)}>
              <Stripes />
              {(top.backdrop || top.poster) && (
                <Image source={{ uri: top.backdrop ?? top.poster! }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              )}
              <LinearGradient
                colors={["rgba(13,17,13,0)", "rgba(13,17,13,0.95)"]}
                locations={[0.3, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={s.topPick}>
                <Text style={s.topPickText}>Top pick</Text>
              </View>
              <View style={s.heroInfo}>
                <Text style={s.heroTitle} numberOfLines={2}>
                  {top.title}
                </Text>
                <Text style={s.heroMeta}>{metaLine(top)}</Text>
              </View>
            </Pressable>
          ) : (
            <Text style={s.empty}>Nothing you both said yes to. Try another genre?</Text>
          )}

          {rest.length > 0 && (
            <View style={{ gap: 10 }}>
              {rest.map((m, i) => (
                <Pressable key={m.id} style={s.row} onPress={() => onWhereToWatch(m)}>
                  <View style={s.thumb}>
                    <Stripes a={i % 2 ? "#203028" : "#20282E"} b={C.stripeB} band={6} />
                    {m.poster && <Image source={{ uri: m.poster }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={s.rowTitle} numberOfLines={1}>
                      {m.title}
                    </Text>
                    <Text style={s.rowMeta}>{metaLine(m, false)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={s.buttons}>
          <Button label="New genre" kind="outline" fontSize={16} onPress={onNewGenre} style={{ flex: 1 }} />
          <Button
            label="Where to watch"
            fontSize={16}
            kind={top ? "primary" : "disabled"}
            onPress={() => top && onWhereToWatch(top)}
            style={{ flex: 1.4 }}
          />
        </View>
      </View>
      <Pressable onPress={onLeave} style={{ alignSelf: "center", padding: 10 }}>
        <Text style={{ fontFamily: F.textSemi, fontSize: 14, color: C.muted }}>Done, leave room</Text>
      </Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { flex: 1, paddingTop: 20, paddingHorizontal: 24, paddingBottom: 36, gap: 22 },
  kicker: { fontFamily: F.textBold, fontSize: 14, color: C.accent },
  heading: { fontFamily: F.displayHeavy, fontSize: 34, lineHeight: 34.7, letterSpacing: -1.02, color: C.cream },
  hero: { height: 200, borderRadius: 24, overflow: "hidden", backgroundColor: C.surface },
  topPick: {
    position: "absolute",
    top: 14,
    left: 14,
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: C.accent,
    justifyContent: "center",
  },
  topPickText: { fontFamily: F.textHeavy, fontSize: 12, color: C.bg },
  heroInfo: { position: "absolute", left: 16, right: 16, bottom: 14, gap: 4 },
  heroTitle: { fontFamily: F.displayHeavy, fontSize: 22, letterSpacing: -0.44, color: C.cream },
  heroMeta: { fontFamily: F.textSemi, fontSize: 13, color: C.muted },
  empty: { fontFamily: F.text, fontSize: 16, lineHeight: 23.2, color: C.muted },
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 10, borderRadius: 18, backgroundColor: C.surface },
  thumb: { width: 48, height: 64, borderRadius: 10, overflow: "hidden", backgroundColor: C.surface2 },
  rowTitle: { fontFamily: F.textBold, fontSize: 16, color: C.cream },
  rowMeta: { fontFamily: F.text, fontSize: 13, color: C.muted },
  buttons: { flexDirection: "row", gap: 10 },
});
