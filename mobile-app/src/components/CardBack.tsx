import { useEffect, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, Linking, Platform, StyleSheet } from "react-native";
import { RotateCcw, X } from "lucide-react-native";
import { C, F } from "./theme";
import { Button } from "./ui-kit";
import TrailerPreview from "./TrailerPreview";
import { fetchDetails, metaLine, providerUrl, whereToWatchUrl, Movie, MovieDetails } from "../lib/tmdb";

// Back of the swipe card: everything you need to decide, without leaving the deck.
export default function CardBack({
  movie,
  onFlipBack,
  closeIcon = false,
  active = true,
  warm = false,
}: {
  movie: Movie;
  onFlipBack: () => void;
  closeIcon?: boolean; // true = shows ✕ (used as a pop-up on the results screen)
  active?: boolean; // false while this side isn't showing, so the trailer doesn't play hidden
  warm?: boolean; // true = start loading the trailer early, paused
}) {
  const [details, setDetails] = useState<MovieDetails | null>(null);

  useEffect(() => {
    setDetails(null);
    fetchDetails(movie.id).then(setDetails);
  }, [movie.id]);

  const logos = details?.providers.filter((p) => p.logo) ?? [];

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.title} numberOfLines={2}>
            {movie.title}
          </Text>
          <Text style={s.meta}>{metaLine(movie)}</Text>
        </View>
        <Pressable
          onPress={onFlipBack}
          hitSlop={10}
          accessibilityLabel={closeIcon ? "Close" : "Back to poster"}
          style={({ pressed }) => [s.flipBtn, pressed && { transform: [{ scale: 0.94 }] }]}
        >
          {closeIcon ? (
            <X size={16} color={C.cream} strokeWidth={2.4} />
          ) : (
            <RotateCcw size={16} color={C.cream} strokeWidth={2.4} />
          )}
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
        {!!details?.trailerKey && (
          <TrailerPreview
            videoKey={details.trailerKey}
            backdrop={movie.backdrop ?? movie.poster}
            warm={warm}
            active={active}
          />
        )}

        {!!details?.tagline && <Text style={s.tagline}>{details.tagline}</Text>}

        {!!details?.genres.length && (
          <View style={s.chips}>
            {details.genres.map((g) => (
              <View key={g} style={s.chip}>
                <Text style={s.chipText}>{g}</Text>
              </View>
            ))}
          </View>
        )}

        {/* saved movies from before didn't store the overview, so fall back to the fetched one */}
        {!!(movie.overview || details?.overview) && (
          <Text style={s.overview}>{movie.overview || details?.overview}</Text>
        )}

        {/* on web the preview has its own YouTube link; the phone app still uses this button */}
        {details?.trailerKey && Platform.OS !== "web" && (
          <Button
            label="Full trailer on YouTube"
            kind="outline"
            height={44}
            fontSize={14}
            onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${details.trailerKey}`)}
            style={{ alignSelf: "flex-start", paddingHorizontal: 20 }}
          />
        )}

        {details &&
          (logos.length ? (
            <>
              <Text style={s.section}>Stream it on</Text>
              <View style={s.providers}>
                {logos.map((p) => (
                  <Pressable key={p.name} onPress={() => Linking.openURL(providerUrl(p.name, movie.title, movie.id))}>
                    <Image source={{ uri: p.logo! }} style={s.providerLogo} />
                  </Pressable>
                ))}
              </View>
              <Text style={s.loading}>Streaming data by JustWatch</Text> 
            </>
          ) : (
            <Button
              label="Where to watch"
              kind="outline"
              height={44}
              fontSize={14}
              onPress={() => Linking.openURL(whereToWatchUrl(movie.id))}
              style={{ alignSelf: "flex-start", paddingHorizontal: 20 }}
            />
          ))}

        {!!details?.cast.length && (
          <>
            <Text style={s.section}>Cast</Text>
            <View style={s.cast}>
              {details.cast.slice(0, 8).map((c, i) => (
                <View key={i} style={s.castCard}>
                  {c.photo ? <Image source={{ uri: c.photo }} style={s.castPhoto} /> : <View style={s.castPhoto} />}
                  <Text style={s.castName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={s.castChar} numberOfLines={1}>
                    {c.character}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {!details && <Text style={s.loading}>Loading…</Text>}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
    root: { flex: 1, paddingTop: 20 },
    header: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
    title: { fontFamily: F.displayHeavy, fontSize: 24, lineHeight: 26, letterSpacing: -0.48, color: C.cream },
    meta: { fontFamily: F.textSemi, fontSize: 13, color: C.muted },
    flipBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.surface2,
    alignItems: "center",
    justifyContent: "center",
    },
    body: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
    tagline: { fontFamily: F.textSemi, fontSize: 15, color: C.accent },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { borderWidth: 1, borderColor: C.chipLine, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
    chipText: { fontFamily: F.textMedium, fontSize: 12, color: C.cream },
    overview: { fontFamily: F.text, fontSize: 14, lineHeight: 20.3, color: C.body },
    section: { fontFamily: F.textBold, fontSize: 15, color: C.cream, marginTop: 6 },
    providers: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    providerLogo: { width: 40, height: 40, borderRadius: 10 },
    cast: { flexDirection: "row", flexWrap: "wrap", rowGap: 14 },
    castCard: { width: "25%", alignItems: "center", gap: 2, paddingHorizontal: 4 },
    castPhoto: { width: 56, height: 56, borderRadius: 999, backgroundColor: C.surface2, marginBottom: 4 },
    castName: { fontFamily: F.textBold, fontSize: 11, lineHeight: 13, color: C.cream, textAlign: "center" },
    castChar: { fontFamily: F.text, fontSize: 10, color: C.muted, textAlign: "center" },
    loading: { fontFamily: F.text, fontSize: 13, color: C.faint },
});