import { useState } from "react";
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from "react-native";
import { X } from "lucide-react-native";
import { NavBar, Screen, Stripes } from "../ui-kit";
import { C, F } from "../theme";
import { getNights, deleteNight, Night, SavedMovie } from "../../lib/savedMatches";

const dateLabel = (at: number) =>
  new Date(at).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

const meta = (m: SavedMovie) => [m.year, m.rating && `★ ${m.rating}`].filter(Boolean).join(" · ");

// Saved: every round you matched on, newest first
export default function SavedScreen({
  onBack,
  onOpen,
}: {
  onBack: () => void;
  onOpen: (m: SavedMovie) => void;
}) {
  const [nights, setNights] = useState<Night[]>(getNights);

  const remove = (id: string) => {
    deleteNight(id);
    setNights(getNights());
  };

  return (
    <Screen>
      <NavBar onBack={onBack} center="Saved" />
      <View style={s.header}>
        <Text style={s.title}>
          Your <Text style={{ color: C.accent }}>matches</Text>
        </Text>
        <Text style={s.sub}>Every movie you matched on, so you can come back to it.</Text>
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
                <Text style={s.nightLabel} numberOfLines={1}>
                  {dateLabel(n.at)} · {n.genre}
                  {n.solo ? " · Solo" : n.with.length ? ` · with ${n.with.join(", ")}` : ""}
                </Text>
                <Pressable onPress={() => remove(n.id)} hitSlop={10} accessibilityLabel="Remove">
                  <X size={16} color={C.faint} strokeWidth={2.4} />
                </Pressable>
              </View>
              {n.movies.map((m, i) => (
                <Pressable key={m.id} style={s.row} onPress={() => onOpen(m)}>
                  <View style={s.thumb}>
                    <Stripes a={i % 2 ? "#203028" : "#20282E"} b={C.stripeB} band={6} />
                    {m.poster && <Image source={{ uri: m.poster }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={s.rowTitle} numberOfLines={1}>{m.title}</Text>
                    <Text style={s.rowMeta}>{meta(m)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 16, gap: 8 },
  title: { fontFamily: F.displayBold, fontSize: 28, lineHeight: 30.8, letterSpacing: -0.56, color: C.cream },
  sub: { fontFamily: F.text, fontSize: 15, lineHeight: 21, color: C.muted },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  empty: { fontFamily: F.text, fontSize: 15, lineHeight: 21, color: C.muted, textAlign: "center" },
  list: { paddingHorizontal: 24, paddingBottom: 36, gap: 26 },
  nightHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  nightLabel: { flex: 1, fontFamily: F.textBold, fontSize: 13, color: C.accent },
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 10, borderRadius: 18, backgroundColor: C.surface },
  thumb: { width: 48, height: 64, borderRadius: 10, overflow: "hidden", backgroundColor: C.surface2 },
  rowTitle: { fontFamily: F.textBold, fontSize: 16, color: C.cream },
  rowMeta: { fontFamily: F.text, fontSize: 13, color: C.muted },
});