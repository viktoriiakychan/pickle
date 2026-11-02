import { useEffect, useMemo, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { Check } from "lucide-react-native";
import { Button, NavBar, Screen } from "../ui-kit";
import { C, F, MAX_WIDTH } from "../theme";
import { TASTE_MOVIES, MIN_FAVS, MAX_FAVS } from "../../lib/tasteMovies";
import { fetchPosters, shuffle, PosterInfo } from "../../lib/tmdb";

// Taste 1: "Pick a few you love". Shown once, editable from the landing screen.
export default function TasteScreen({
  initial,
  editing,
  onDone,
  onSkip,
}: {
  initial: string[];      // already-saved favourites (when editing)
  editing?: boolean;      // true = opened from "Your taste", so Skip says Cancel
  onDone: (favs: string[]) => void;
  onSkip: () => void;
}) {
  const movies = useMemo(() => shuffle(TASTE_MOVIES), []); // new order every time, but stable while open
  const [posters, setPosters] = useState<Record<string, PosterInfo>>({});
  const [picked, setPicked] = useState<string[]>(initial);

  const { width } = useWindowDimensions();
  const colW = (Math.min(width, MAX_WIDTH) - 48 - 20) / 3; // 24px padding each side, 2 gaps of 10

  useEffect(() => {
    fetchPosters(TASTE_MOVIES.map((m) => m.id)).then(setPosters);
  }, []);

  const full = picked.length >= MAX_FAVS;
  const ready = picked.length >= MIN_FAVS;

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_FAVS ? p : [...p, id]));

  return (
    <Screen>
      <NavBar
        right={
          <Pressable onPress={onSkip} hitSlop={8}>
            <Text style={s.skip}>{editing ? "Cancel" : "Skip"}</Text>
          </Pressable>
        }
      />

      <View style={s.header}>
        <Text style={s.title}>
          Pick a few you <Text style={{ color: C.accent }}>love</Text>
        </Text>
        <Text style={s.sub}>
          Choose {MIN_FAVS} to {MAX_FAVS}. We'll use them to find movies you'll actually want to watch.
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
        {movies.map((m) => {
          const on = picked.includes(m.id);
          const p = posters[m.id];
          return (
            <Pressable
              key={m.id}
              accessibilityLabel={m.title}
              onPress={() => toggle(m.id)}
              style={({ pressed }) => [{ width: colW }, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <View style={[s.poster, { height: colW * 1.5 }, full && !on && s.dim]}>
                {p?.poster ? (
                  <Image source={{ uri: p.poster }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <Text style={s.fallback}>{m.title}</Text>
                )}
                {on && <View style={s.ring} />}
              </View>
              {on && (
                <View style={s.badge}>
                  <Check size={14} color={C.bg} strokeWidth={3} />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={s.footer}>
        <Button
          label={ready ? `Continue · ${picked.length} picked` : `Pick ${MIN_FAVS - picked.length} more`}
          kind={ready ? "primary" : "disabled"}
          onPress={() => onDone(picked)}
        />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  skip: { fontFamily: F.textSemi, fontSize: 15, color: C.muted },
  header: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 16, gap: 8 },
  title: { fontFamily: F.displayBold, fontSize: 28, lineHeight: 30.8, letterSpacing: -0.56, color: C.cream },
  sub: { fontFamily: F.text, fontSize: 15, lineHeight: 21, color: C.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 24, paddingBottom: 24 },
  poster: { borderRadius: 14, overflow: "hidden", backgroundColor: C.surface, justifyContent: "center", padding: 8 },
  ring: { ...StyleSheet.absoluteFill, borderRadius: 14, borderWidth: 3, borderColor: C.accent },
  dim: { opacity: 0.35 },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: { fontFamily: F.textSemi, fontSize: 12, color: C.muted, textAlign: "center" },
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 36 },
});