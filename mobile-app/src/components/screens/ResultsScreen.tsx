import { useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, Animated, StyleSheet } from "react-native";
import DetailsSheet from "../DetailsSheet";
import { LinearGradient } from "expo-linear-gradient";
import { Dices } from "lucide-react-native";
import { Button, Screen, Stripes } from "../ui-kit";
import { C, F } from "../theme";
import { metaLine, Movie } from "../../lib/tmdb";
import type { Tonight } from "../../lib/room";

const TICKS = 18; // how many posters flick past before it lands (~2.5s)
const FRESH_MS = 8000; // a pick newer than this plays the spin; older (e.g. after a refresh) just shows the result
const buzz = (ms: number) => {
  try {
    (globalThis as any).navigator?.vibrate?.(ms);
  } catch {}
};

/** Gap before tick i: starts fast, slows down a lot at the end (slot machine) */
const tickDelay = (i: number) => 55 + 330 * Math.pow(i / TICKS, 2.6);

// 06 Results: shared matches, and "Pick for us"
export default function ResultsScreen({
  genreTitle,
  names,
  matches,
  votes,
  groupSize,
  onNewGenre,
  onWhereToWatch,
  onLeave,
  tonight,
  onSpin,
}: {
  genreTitle: string;
  names: string[]; // host first
  matches: Movie[]; // best first
  votes: Record<string, number>; // movie id → how many said yes
  groupSize: number; // how many people played (1 = solo)
  onNewGenre: () => void;
  onWhereToWatch: (m: Movie) => void;
  onLeave: () => void;
  tonight: Tonight | null; // the room's "Pick for us" result (shared by everyone)
  onSpin: (movieId: string, spin: number) => void;
}) {
  const [open, setOpen] = useState<Movie | null>(null); // movie whose details pop-up is showing

  const solo = groupSize === 1;
  const canSpin = matches.length >= 2;
  const count = `${matches.length} ${matches.length === 1 ? "movie" : "movies"}`;
  const heading =
    matches.length === 0
      ? solo
        ? "Nothing caught your eye"
        : "No matches this time"
      : solo
      ? `You picked ${count}`
      : `You matched on ${count}`;

  // vote label, only for 3+ people (with 2, every match is "both")
  const votesLabel = (m: Movie) =>
    groupSize <= 2 ? "" : votes[m.id] === groupSize ? "Everyone's in" : `${votes[m.id]} of ${groupSize} said yes`;
  const meta = (m: Movie, withRuntime = true) => [metaLine(m, withRuntime), votesLabel(m)].filter(Boolean).join(" · ");

  /* -- Pick for us ------------------------------------------------------- */
  const [shown, setShown] = useState<Movie | null>(null); // poster currently flicking past
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState<Movie | null>(null);
  const pop = useRef(new Animated.Value(1)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // load every match's picture now, so the spin doesn't flash empty boxes
  useEffect(() => {
    matches.forEach((m) => {
      const uri = m.backdrop ?? m.poster;
      if (uri) Image.prefetch(uri).catch(() => {});
    });
  }, [matches.length]);

  // movies more people said yes to are more likely to win (with 2 people, all equal)
  const choose = (exclude?: string) => {
    const pool = matches.filter((m) => m.id !== exclude);
    const weights = pool.map((m) => Math.pow(votes[m.id] ?? 1, 2));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  };

  // whenever the room gets a new pick, every phone plays the same landing
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const winner = tonight && matches.find((m) => m.id === tonight.movieId);
    if (!tonight || !winner) {
      setLanded(null);
      setSpinning(false);
      return;
    }
    if (Date.now() - tonight.at > FRESH_MS) {
      setLanded(winner); // old pick (refreshed the page): no replay
      return;
    }

    // the reel: random posters (never the same twice in a row), ending on the winner
    const reel: Movie[] = [];
    for (let i = 0; i < TICKS - 1; i++) {
      const options = matches.filter((m) => m !== reel[i - 1] && (i < TICKS - 2 || m !== winner));
      reel.push(options[Math.floor(Math.random() * options.length)]);
    }
    reel.push(winner);

    setLanded(null);
    setSpinning(true);
    let t = 0;
    reel.forEach((m, i) => {
      t += tickDelay(i);
      timers.current.push(
        setTimeout(() => {
          setShown(m);
          buzz(i === TICKS - 1 ? 30 : 4); // little tick each poster, bigger one on the landing
          if (i === TICKS - 1) {
            setSpinning(false);
            setLanded(winner);
            pop.setValue(0.92);
            Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: false }).start();
          }
        }, t)
      );
    });
    return () => timers.current.forEach(clearTimeout);
  }, [tonight?.at]);

  const spin = () => {
    if (spinning || !canSpin) return;
    onSpin(choose().id, 1);
  };
  const spinAgain = () => {
    if (spinning || !tonight) return;
    onSpin(choose(tonight.movieId).id, tonight.spin + 1); // never the same one twice in a row
  };

  // the hero: one match → that's it; spun → tonight's pick; not spun yet → the "Pick for us" card
  const heroMovie = matches.length === 1 ? matches[0] : spinning ? shown : landed;
  const listed = matches.filter((m) => m !== heroMovie || spinning);
  const mainMovie = landed ?? (matches.length === 1 ? matches[0] : null);

  return (
    <Screen>
      <View style={s.body}>
        <View style={{ gap: 6 }}>
          <Text style={s.kicker}>
            {genreTitle} · {solo ? "Solo" : names.length > 3 ? `${names.length} pickles` : names.join(" + ")}
          </Text>
          <Text style={s.heading}>{heading}</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 22 }} showsVerticalScrollIndicator={false}>
          {matches.length === 0 ? (
            <Text style={s.empty}>
              {solo
                ? "You passed on everything."
                : groupSize > 2
                ? "Nothing most of you said yes to."
                : "Nothing you both said yes to."}{" "}
              Try another genre?
            </Text>
          ) : heroMovie ? (
            <View style={{ gap: 10 }}>
              <Animated.View style={[s.heroWrap, landed && s.heroGlow, { transform: [{ scale: pop }] }]}>
                <Pressable style={s.hero} disabled={spinning} onPress={() => heroMovie && setOpen(heroMovie)}>
                  <Stripes />
                  {(heroMovie.backdrop || heroMovie.poster) && (
                    <Image
                      source={{ uri: heroMovie.backdrop ?? heroMovie.poster! }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                  )}
                  <LinearGradient
                    colors={["rgba(13,17,13,0)", "rgba(13,17,13,0.95)"]}
                    locations={[0.3, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                  {spinning ? (
                    <View style={s.badgeMuted}>
                      <Text style={s.badgeMutedText}>Picking…</Text>
                    </View>
                  ) : (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{landed ? "Tonight's pick" : "Your match"}</Text>
                    </View>
                  )}
                  <View style={s.heroInfo}>
                    {!spinning && landed && <Text style={s.tonightLabel}>Tonight you're watching</Text>}
                    <Text style={[s.heroTitle, spinning && { opacity: 0.6 }]} numberOfLines={2}>
                      {heroMovie.title}
                    </Text>
                    {!spinning && <Text style={s.heroMeta}>{meta(heroMovie)}</Text>}
                  </View>
                </Pressable>
              </Animated.View>

              {landed && tonight && canSpin && (
                <Pressable onPress={spinAgain} hitSlop={8} style={{ alignSelf: "center" }}>
                  <Text style={s.link}>Not feeling it? Spin again</Text>
                </Pressable>
              )}
            </View>
          ) : (
            /* not picked yet: the "Pick for us" card sits where the big poster goes */
            <Pressable onPress={spin} style={({ pressed }) => [s.pickCard, pressed && { transform: [{ scale: 0.98 }] }]}>
              <View style={s.fan}>
                {matches.slice(0, 3).map((m, i) => (
                  <View
                    key={m.id}
                    style={[
                      s.fanPoster,
                      { zIndex: i === 1 ? 2 : 1, transform: [{ rotate: `${(i - 1) * 9}deg` }, { translateY: i === 1 ? -4 : 4 }] },
                    ]}
                  >
                    <Stripes />
                    {m.poster && <Image source={{ uri: m.poster }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                  </View>
                ))}
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={s.pickTitle}>Can't decide?</Text>
                <Text style={s.pickSub}>Let Pickle pick one of your {matches.length} for tonight.</Text>
                <View style={s.pickBtn}>
                  <Dices size={16} color={C.bg} strokeWidth={2.4} />
                  <Text style={s.pickBtnText}>Pick for us</Text>
                </View>
              </View>
            </Pressable>
          )}

          {listed.length > 0 && (
            <View style={{ gap: 10 }}>
              {landed && <Text style={s.listLabel}>Your other matches</Text>}
              {listed.map((m, i) => (
                <Pressable key={m.id} style={s.row} onPress={() => setOpen(m)}>
                  <View style={s.thumb}>
                    <Stripes a={i % 2 ? "#203028" : "#20282E"} b={C.stripeB} band={6} />
                    {m.poster && <Image source={{ uri: m.poster }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={s.rowTitle} numberOfLines={1}>
                      {m.title}
                    </Text>
                    <Text style={s.rowMeta}>{meta(m, false)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={s.buttons}>
          <Button label="New genre" kind="outline" fontSize={16} onPress={onNewGenre} style={{ flex: 1 }} />
          {mainMovie || !canSpin ? (
            <Button
              label="Where to watch"
              fontSize={16}
              kind={mainMovie && !spinning ? "primary" : "disabled"}
              onPress={() => mainMovie && onWhereToWatch(mainMovie)}
              style={{ flex: 1.4 }}
            />
          ) : (
            <Button
              label={spinning ? "Picking…" : "🎲 Pick for us"}
              fontSize={16}
              kind={spinning ? "disabled" : "primary"}
              onPress={spin}
              style={{ flex: 1.4 }}
            />
          )}
        </View>
      </View>
      <Pressable onPress={onLeave} style={{ alignSelf: "center", padding: 10 }}>
        <Text style={{ fontFamily: F.textSemi, fontSize: 14, color: C.muted }}>Done, leave room</Text>
      </Pressable>

      {/* details pop-up: same info as the back of the swipe card, without leaving the app */}
      <DetailsSheet movie={open} onClose={() => setOpen(null)} />
    </Screen>
  );
}

const s = StyleSheet.create({
  body: { flex: 1, paddingTop: 20, paddingHorizontal: 24, paddingBottom: 36, gap: 22 },
  kicker: { fontFamily: F.textBold, fontSize: 14, color: C.accent },
  heading: { fontFamily: F.displayHeavy, fontSize: 34, lineHeight: 34.7, letterSpacing: -1.02, color: C.cream },

  heroWrap: { borderRadius: 24 },
  heroGlow: {
    borderWidth: 2,
    borderColor: C.accent,
    shadowColor: C.accent,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  hero: { height: 200, borderRadius: 22, overflow: "hidden", backgroundColor: C.surface },
  badge: {
    position: "absolute",
    top: 14,
    left: 14,
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: C.accent,
    justifyContent: "center",
  },
  badgeText: { fontFamily: F.textHeavy, fontSize: 12, color: C.bg },
  badgeMuted: {
    position: "absolute",
    top: 14,
    left: 14,
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(13,17,13,0.7)",
    justifyContent: "center",
  },
  badgeMutedText: { fontFamily: F.textBold, fontSize: 12, color: C.cream },
  heroInfo: { position: "absolute", left: 16, right: 16, bottom: 14, gap: 4 },
  tonightLabel: { fontFamily: F.textBold, fontSize: 12, color: C.accent },
  heroTitle: { fontFamily: F.displayHeavy, fontSize: 22, letterSpacing: -0.44, color: C.cream },
  heroMeta: { fontFamily: F.textSemi, fontSize: 13, color: C.muted },
  link: { fontFamily: F.textSemi, fontSize: 13, color: C.muted, textDecorationLine: "underline" },

  pickCard: {
    height: 200,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.line,
  },
  fan: { width: 104, height: 120, alignItems: "center", justifyContent: "center" },
  fanPoster: {
    position: "absolute",
    width: 62,
    height: 92,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: C.surface2,
    borderWidth: 2,
    borderColor: C.surface,
  },
  pickTitle: { fontFamily: F.displayHeavy, fontSize: 22, letterSpacing: -0.44, color: C.cream },
  pickSub: { fontFamily: F.text, fontSize: 13, lineHeight: 18, color: C.muted },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: C.accent,
    marginTop: 4,
  },
  pickBtnText: { fontFamily: F.textBold, fontSize: 14, color: C.bg },

  listLabel: { fontFamily: F.textBold, fontSize: 13, color: C.muted },
  empty: { fontFamily: F.text, fontSize: 16, lineHeight: 23.2, color: C.muted },
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 10, borderRadius: 18, backgroundColor: C.surface },
  thumb: { width: 48, height: 64, borderRadius: 10, overflow: "hidden", backgroundColor: C.surface2 },
  rowTitle: { fontFamily: F.textBold, fontSize: 16, color: C.cream },
  rowMeta: { fontFamily: F.text, fontSize: 13, color: C.muted },
  buttons: { flexDirection: "row", gap: 10 },
});