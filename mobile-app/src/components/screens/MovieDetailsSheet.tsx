import { useEffect, useState } from "react";
import { View, Text, Image, Pressable, Modal, ScrollView, Linking, StyleSheet } from "react-native";
import { C, F, MAX_WIDTH } from "../theme";
import { Button } from "../ui-kit";
import { fetchDetails, metaLine, providerUrl, whereToWatchUrl, Movie, MovieDetails } from "../../lib/tmdb";

export default function MovieDetailsSheet({ movie, onClose }: { movie: Movie | null; onClose: () => void }) {
  const [details, setDetails] = useState<MovieDetails | null>(null);

  useEffect(() => {
    setDetails(null);
    if (movie) fetchDetails(movie.id).then(setDetails);
  }, [movie?.id]);

  return (
    <Modal visible={!!movie} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          {movie && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
              {(movie.backdrop || movie.poster) && (
                <Image source={{ uri: movie.backdrop ?? movie.poster! }} style={s.image} resizeMode="cover" />
              )}
              <Text style={s.title}>{movie.title}</Text>
              {!!details?.tagline && <Text style={s.tagline}>{details.tagline}</Text>}
              <Text style={s.meta}>{metaLine(movie)}</Text>
              {!!details?.genres.length && (
                <View style={s.chips}>
                  {details.genres.map((g) => (
                    <View key={g} style={s.chip}><Text style={s.chipText}>{g}</Text></View>
                  ))}
                </View>
              )}
              {!!movie.overview && <Text style={s.overview}>{movie.overview}</Text>}

              {details?.trailerKey && (
                <Button
                  label="Watch trailer"
                  height={48}
                  fontSize={15}
                  onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${details.trailerKey}`)}
                  style={{ alignSelf: "flex-start", paddingHorizontal: 22, marginTop: 4 }}
                />
              )}
              {details && (
                details.providers.some((p) => p.logo) ? (
                  <>
                    <Text style={s.section}>Stream it on</Text>
                    <View style={s.providers}>
                      {details.providers.map((p) =>
                        p.logo && (
                          <Pressable key={p.name} onPress={() => Linking.openURL(providerUrl(p.name, movie.title, movie.id))}>
                            <Image source={{ uri: p.logo }} style={s.providerLogo} />
                          </Pressable>
                        )
                      )}
                    </View>
                  </>
                ) : (
                  <Button
                    label="Where to watch"
                    kind="outline"
                    height={48}
                    fontSize={15}
                    onPress={() => Linking.openURL(whereToWatchUrl(movie.id))}
                    style={{ alignSelf: "flex-start", paddingHorizontal: 22 }}
                  />
                )
              )}
              {!!details?.cast.length && (
                <>
                  <Text style={s.section}>Cast</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                    {details.cast.map((c, i) => (
                      <View key={i} style={s.castCard}>
                        {c.photo ? (
                          <Image source={{ uri: c.photo }} style={s.castPhoto} />
                        ) : (
                          <View style={s.castPhoto} />
                        )}
                        <Text style={s.castName} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={s.castChar} numberOfLines={1}>
                          {c.character}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.7)",
  justifyContent: "center",   // was "flex-end" (that's what pinned it to the bottom)
  alignItems: "center",
  padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    maxHeight: "90%",
    backgroundColor: C.bg,
    borderRadius: 28,           // all corners now, not just the top
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 9, backgroundColor: C.surface2, marginBottom: 16 },
  image: { width: "100%", height: 200, borderRadius: 24, backgroundColor: C.surface },
  title: { fontFamily: F.displayHeavy, fontSize: 28, lineHeight: 29.4, letterSpacing: -0.56, color: C.cream, marginTop: 4 },
  meta: { fontFamily: F.textSemi, fontSize: 13, color: C.muted },
  overview: { fontFamily: F.text, fontSize: 15, lineHeight: 21.75, color: C.body },
  section: { fontFamily: F.textBold, fontSize: 16, color: C.cream, marginTop: 12 },
  castCard: { width: 72, alignItems: "center", gap: 2 },
  castPhoto: { width: 60, height: 60, borderRadius: 999, backgroundColor: C.surface, marginBottom: 4 },
  castName: { fontFamily: F.textBold, fontSize: 12, color: C.cream, textAlign: "center" },
  castChar: { fontFamily: F.text, fontSize: 11, color: C.muted, textAlign: "center" },

  tagline: { fontFamily: F.textSemi, fontSize: 15, color: C.accent, marginTop: -4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: C.chipLine, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { fontFamily: F.textMedium, fontSize: 12, color: C.cream },
  providers: { flexDirection: "row", gap: 10 },
  providerLogo: { width: 40, height: 40, borderRadius: 10 },
  
});
