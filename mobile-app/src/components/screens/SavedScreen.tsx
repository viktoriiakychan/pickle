import { useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, Animated, Easing, StyleSheet } from "react-native";
import { Check, X } from "lucide-react-native";
import { NavBar, Screen, Stripes } from "../ui-kit";
import { C, F } from "../theme";
import DetailsSheet from "../DetailsSheet";
import type { Movie } from "../../lib/tmdb";
import {
  getNights,
  deleteNight,
  restoreNight,
  getWatched,
  setWatched,
  Night,
  SavedMovie,
} from "../../lib/savedMatches";

const UNDO_MS = 5000; // how long "Undo" stays up after removing a night

const dateLabel = (at: number) =>
  new Date(at).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

const meta = (m: SavedMovie) => [m.year, m.rating && `★ ${m.rating}`, m.runtime].filter(Boolean).join(" · ");

// the details pop-up wants a full Movie; older saves are missing a few fields (it fetches what it needs)
const asMovie = (m: SavedMovie): Movie => ({ overview: "", backdrop: null, runtime: "", tagline: "", ...m });

// Saved: every round you matched on, newest first
export default function SavedScreen({
  onBack,
  onWatched,
}: {
  onBack: () => void;
  onWatched: (id: string, watched: boolean) => void; // so a watched movie stops coming up in decks
}) {
  const [nights, setNights] = useState<Night[]>(getNights);
  const [watched, setWatchedIds] = useState<Set<string>>(getWatched);
  const [open, setOpen] = useState<Movie | null>(null);

  /* ── watched tick ── */
  const toggleWatched = (id: string) => {
    const on = !watched.has(id);
    setWatched(id, on);
    setWatchedIds(getWatched());
    onWatched(id, on);
  };

  /* ── remove a night, with a few seconds to undo ── */
  const [removed, setRemoved] = useState<Night | null>(null);
  const toastIn = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = () =>
    Animated.timing(toastIn, { toValue: 0, duration: 200, useNativeDriver: false }).start(
      ({ finished }) => finished && setRemoved(null)
    );

  const remove = (n: Night) => {
    deleteNight(n.id);
    setNights(getNights());
    setRemoved(n); // if another one was waiting to be undone, it's gone for good now
    toastIn.setValue(0);
    Animated.timing(toastIn, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(hideToast, UNDO_MS);
  };

  const undo = () => {
    if (!removed) return;
    restoreNight(removed);
    setNights(getNights());
    if (timer.current) clearTimeout(timer.current);
    hideToast();
  };

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <Screen>
      <NavBar onBack={onBack} center="Saved" />
      <View style={s.header}>
        <Text style={s.title}>
          Your <Text style={{ color: C.accent }}>matches</Text>
        </Text>
        <Text style={s.sub}>Every movie you matched on. Tick the ones you've watched.</Text>
      </View>

      {nights.length === 0 ? (
        <View style={s.center}>
          <Text style={s.empty}>Nothing yet. Finish a round and your matches land here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {nights.map((n) => (
            <View key={n.id} style={{ gap: 10 }}>
              <View style={s.nightHead}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.nightLabel} numberOfLines={1}>
                    {dateLabel(n.at)}
                    {n.solo ? " · Solo" : n.with.length ? ` · with ${n.with.join(", ")}` : ""}
                  </Text>
                  {/* every genre, not "Crime + 3 more" (older saves only have the short name) */}
                  <Text style={s.nightGenres}>{n.genres?.length ? n.genres.join(", ") : n.genre}</Text>
                </View>
                <Pressable onPress={() => remove(n)} hitSlop={10} accessibilityLabel="Remove this night">
                  <X size={16} color={C.faint} strokeWidth={2.4} />
                </Pressable>
              </View>

              {n.movies.map((m, i) => {
                const seen = watched.has(m.id);
                return (
                  <View key={m.id} style={s.row}>
                    {/* tap the movie: details pop-up */}
                    <Pressable
                      style={({ pressed }) => [s.rowMain, pressed && { opacity: 0.7 }]}
                      onPress={() => setOpen(asMovie(m))}
                      accessibilityLabel={`${m.title} details`}
                    >
                      <View style={[s.thumb, seen && s.faded]}>
                        <Stripes a={i % 2 ? "#203028" : "#20282E"} b={C.stripeB} band={6} />
                        {m.poster && <Image source={{ uri: m.poster }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                      </View>
                      <View style={[{ flex: 1, gap: 3 }, seen && s.faded]}>
                        <Text style={s.rowTitle} numberOfLines={1}>
                          {m.title}
                        </Text>
                        <Text style={s.rowMeta} numberOfLines={1}>
                          {seen ? "Watched" : meta(m)}
                        </Text>
                      </View>
                    </Pressable>

                    {/* tap the circle: watched / not watched */}
                    <Pressable
                      onPress={() => toggleWatched(m.id)}
                      hitSlop={8}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: seen }}
                      accessibilityLabel={seen ? "Watched" : "Mark as watched"}
                      style={({ pressed }) => [s.tick, seen && s.tickOn, pressed && { transform: [{ scale: 0.9 }] }]}
                    >
                      <Check size={16} color={seen ? C.bg : C.faint} strokeWidth={3} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      {/* "Night removed · Undo" */}
      {removed && (
        <Animated.View
          style={[
            s.toast,
            { opacity: toastIn, transform: [{ translateY: toastIn.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
          ]}
        >
          <Text style={s.toastText} numberOfLines={1}>
            Removed {dateLabel(removed.at)}
          </Text>
          <Pressable onPress={undo} hitSlop={10}>
            <Text style={s.undo}>Undo</Text>
          </Pressable>
        </Animated.View>
      )}

      <DetailsSheet movie={open} onClose={() => setOpen(null)} />
    </Screen>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 16, gap: 8 },
  title: { fontFamily: F.displayBold, fontSize: 28, lineHeight: 30.8, letterSpacing: -0.56, color: C.cream },
  sub: { fontFamily: F.text, fontSize: 15, lineHeight: 21, color: C.muted },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  empty: { fontFamily: F.text, fontSize: 15, lineHeight: 21, color: C.muted, textAlign: "center" },
  list: { paddingHorizontal: 24, paddingBottom: 96, gap: 26 },
  nightHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  nightLabel: { fontFamily: F.textBold, fontSize: 13, color: C.accent },
  nightGenres: { fontFamily: F.text, fontSize: 13, lineHeight: 18, color: C.muted },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingRight: 14, borderRadius: 18, backgroundColor: C.surface },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 14, padding: 10 },
  thumb: { width: 48, height: 64, borderRadius: 10, overflow: "hidden", backgroundColor: C.surface2 },
  faded: { opacity: 0.45 },
  rowTitle: { fontFamily: F.textBold, fontSize: 16, color: C.cream },
  rowMeta: { fontFamily: F.text, fontSize: 13, color: C.muted },
  tick: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  tickOn: { backgroundColor: C.accent, borderColor: C.accent },
  toast: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.line,
  },
  toastText: { flex: 1, fontFamily: F.text, fontSize: 14, color: C.cream },
  undo: { fontFamily: F.textBold, fontSize: 14, color: C.accent },
});