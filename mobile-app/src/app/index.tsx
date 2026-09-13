import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  Animated,
  PanResponder,
  Dimensions,
  Modal,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Flame, Compass, Palette, Smile, Eye, Clapperboard, Home, Sparkles,
  ScrollText, Skull, Music, HelpCircle, Heart, Rocket, Tv, Zap, Shield,
  Tent, Film, Star, Undo2, Flag, X, Play,
} from "lucide-react-native";

const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = 100;

const ACCENT = "#E63946";
const ACCENT_DIM = "#4A1118";
const BG = "#08080A";
const SURFACE = "#141416";
const SURFACE_LIGHT = "#1C1C20";
const TEXT_PRIMARY = "#F2F2F0";
const TEXT_SECONDARY = "#6E6E72";

type Genre = { id: string; title: string };
type Movie = {
  id: string;
  title: string;
  year: string;
  rating: string;
  poster: string | null;
  overview: string;
};
type MovieDetails = {
  cast: { name: string; character: string; photo: string | null }[];
  trailerKey: string | null;
};

const GENRE_ICONS: Record<string, any> = {
  Action: Flame, Adventure: Compass, Animation: Palette, Comedy: Smile,
  Crime: Eye, Documentary: Clapperboard, Drama: ScrollText, Family: Home,
  Fantasy: Sparkles, History: ScrollText, Horror: Skull, Music: Music,
  Mystery: HelpCircle, Romance: Heart, "Science Fiction": Rocket,
  "TV Movie": Tv, Thriller: Zap, War: Shield, Western: Tent,
};

export default function Index() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [history, setHistory] = useState<{ liked: boolean }[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const [page, setPage] = useState(1);
  const [detailOpen, setDetailOpen] = useState(false);
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const pan = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    fetch(`https://api.themoviedb.org/3/genre/movie/list?language=en&api_key=${API_KEY}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.genres) {
          setGenres(data.genres.map((g: any) => ({ id: String(g.id), title: g.name })));
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedGenre) return;
    fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&with_genres=${selectedGenre.id}&page=${page}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.results) {
          const newMovies = data.results.map((m: any) => ({
            id: String(m.id),
            title: m.title,
            year: m.release_date ? m.release_date.slice(0, 4) : "",
            rating: typeof m.vote_average === "number" ? m.vote_average.toFixed(1) : "",
            poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
            overview: m.overview ?? "",
          }));
          setMovies((prev) => [...prev, ...newMovies]);
        }
      });
  }, [selectedGenre, page]);
  
  useEffect(() => {
    // prefetch the next 3 posters so they're ready when the card appears
    for (let i = 1; i <= 3; i++) {
      const upcoming = movies[currentIndex + i];
      if (upcoming?.poster) {
        Image.prefetch(upcoming.poster);
      }
    }
  }, [currentIndex, movies]);

  const currentMovie = movies[currentIndex];
  const nextMovie = movies[currentIndex + 1];

  const advance = (wasLiked: boolean) => {
    setHistory((prev) => [...prev, { liked: wasLiked }]);
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    if (nextIndex >= movies.length - 5) {
      setPage((prev) => prev + 1);
    }
  };

  const handleLike = () => {
    if (!currentMovie) return;
    setLiked((prev) => [...prev, currentMovie.title]);
    advance(true);
  };

  const handlePass = () => {
    if (!currentMovie) return;
    advance(false);
  };

  const handleUndo = () => {
    if (history.length === 0 || currentIndex === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCurrentIndex((prev) => prev - 1);
    if (last.liked) {
      setLiked((prev) => prev.slice(0, -1));
    }
  };

  const handleFinish = () => {
    setCurrentIndex(movies.length);
  };

  const pickGenre = (g: Genre) => {
    setSelectedGenre(g);
    setMovies([]);
    setPage(1);
    setCurrentIndex(0);
    setLiked([]);
    setHistory([]);
  };

  const openDetails = async () => {
    if (!currentMovie) return;
    setDetailOpen(true);
    setLoadingDetails(true);
    setDetails(null);
    try {
      const [creditsRes, videosRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/${currentMovie.id}/credits?api_key=${API_KEY}`),
        fetch(`https://api.themoviedb.org/3/movie/${currentMovie.id}/videos?api_key=${API_KEY}`),
      ]);
      const creditsData = await creditsRes.json();
      const videosData = await videosRes.json();
      const cast = (creditsData.cast ?? []).slice(0, 8).map((c: any) => ({
        name: c.name,
        character: c.character,
        photo: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
      }));
      const trailer = (videosData.results ?? []).find(
        (v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
      );
      setDetails({ cast, trailerKey: trailer?.key ?? null });
    } catch {
      setDetails({ cast: [], trailerKey: null });
    }
    setLoadingDetails(false);
  };

  const handlersRef = useRef({ handleLike, handlePass });
  useEffect(() => {
    handlersRef.current = { handleLike, handlePass };
  });

  const cardOpacity = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
  PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) < 5 && Math.abs(g.dy) < 5) {
        return;
      }
      if (g.dx > SWIPE_THRESHOLD) {
        Animated.timing(pan, {
          toValue: { x: SCREEN_WIDTH + 100, y: g.dy },
          duration: 250,
          useNativeDriver: false,
        }).start(() => {
          cardOpacity.setValue(0);
          handlersRef.current.handleLike();
          requestAnimationFrame(() => {
            pan.setValue({ x: 0, y: 0 });
            requestAnimationFrame(() => {
              cardOpacity.setValue(1);
            });
          });
        });
      } else if (g.dx < -SWIPE_THRESHOLD) {
        Animated.timing(pan, {
          toValue: { x: -SCREEN_WIDTH - 100, y: g.dy },
          duration: 250,
          useNativeDriver: false,
        }).start(() => {
          cardOpacity.setValue(0);
          handlersRef.current.handlePass();
          requestAnimationFrame(() => {
            pan.setValue({ x: 0, y: 0 });
            requestAnimationFrame(() => {
              cardOpacity.setValue(1);
            });
          });
        });
      } else {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          friction: 5,
          tension: 80,
        }).start();
      }
    },
  })
).current;

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const passOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const GenreIcon = selectedGenre ? GENRE_ICONS[selectedGenre.title] ?? Film : Film;

  const renderCard = (movie: Movie, isNext?: boolean) => (
    <View
      style={[
        styles.mainCard,
        isNext && { zIndex: 0 },
        !isNext && { zIndex: 1 },
      ]}
      pointerEvents={isNext ? "none" : "auto"}
    >
      {movie.poster ? (
        <Image source={{ uri: movie.poster }} style={styles.poster} resizeMode="cover" />
      ) : (
        <View style={styles.posterFallback}>
          <GenreIcon size={48} color={TEXT_SECONDARY} />
        </View>
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.97)"]}
        locations={[0.35, 0.6, 1]}
        style={styles.cardGradient}
      />
      <View style={styles.cardInfo}>
        <Text style={styles.movieTitle}>{movie.title}</Text>
        <View style={styles.movieMetaRow}>
          {!!movie.year && (
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>{movie.year}</Text>
            </View>
          )}
          {!!movie.rating && (
            <View style={styles.metaPill}>
              <Star size={11} color="#FFC93C" fill="#FFC93C" />
              <Text style={styles.metaPillText}>{movie.rating}</Text>
            </View>
          )}
        </View>
        {!!movie.overview && (
          <Text style={styles.movieOverview} numberOfLines={3}>{movie.overview}</Text>
        )}
        {!isNext && (
          <Pressable style={styles.moreBtn} onPress={openDetails}>
            <Text style={styles.moreBtnText}>SEE MORE</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  // screen 1: pick a genre
  if (!selectedGenre) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Film size={14} color="#fff" />
          </View>
          <Text style={styles.brand}>NIGHTPICK</Text>
        </View>
        <Text style={styles.h1}>What are we{"\n"}watching?</Text>
        <Text style={styles.subtitle}>Choose a genre to start swiping</Text>
        <ScrollView contentContainerStyle={styles.genreGrid} showsVerticalScrollIndicator={false}>
          {genres.map((g) => {
            const Icon = GENRE_ICONS[g.title] ?? Film;
            return (
              <Pressable key={g.id} onPress={() => pickGenre(g)} style={styles.genreCard}>
                <View style={styles.genreIconWrap}>
                  <Icon size={20} color={ACCENT} />
                </View>
                <Text style={styles.genreCardLabel}>{g.title}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // screen 2: loading
  if (movies.length === 0) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={ACCENT} size="large" />
        <Text style={[styles.subtitle, { marginTop: 12 }]}>Loading...</Text>
      </View>
    );
  }

  // screen 3: done
  if (currentIndex >= movies.length) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <View style={[styles.genreIconWrap, { width: 56, height: 56, borderRadius: 28, marginBottom: 12 }]}>
          <Heart size={26} color={ACCENT} />
        </View>
        <Text style={styles.h1}>Done.</Text>
        <Text style={[styles.subtitle, { textAlign: "center", marginTop: 4 }]}>
          {liked.length > 0 ? `You liked: ${liked.join(", ")}` : "You didn't like anything"}
        </Text>
        <Pressable style={styles.primaryBtn} onPress={() => setSelectedGenre(null)}>
          <Text style={styles.primaryBtnText}>GO AGAIN</Text>
        </Pressable>
      </View>
    );
  }

  // screen 4: swipe
  return (
    <View style={styles.screen}>
      <View style={styles.swipeTopBar}>
        <Pressable onPress={() => setSelectedGenre(null)}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <View style={styles.genreBadge}>
          <GenreIcon size={12} color={ACCENT} />
          <Text style={styles.genreBadgeText}>{selectedGenre.title.toUpperCase()}</Text>
        </View>
        <Text style={styles.counter}>{currentIndex + 1}/{movies.length}</Text>
      </View>

      <View style={styles.cardWrapper}>
        {nextMovie && renderCard(nextMovie, true)}

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 1 },
            { opacity: cardOpacity },
            { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] },
          ]}
        >
          {renderCard(currentMovie)}

          <Animated.View style={[styles.swipeLabel, styles.likeLabel, { opacity: likeOpacity }]}>
            <Text style={[styles.swipeLabelText, { color: "#2ECC71" }]}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.swipeLabel, styles.passLabel, { opacity: passOpacity }]}>
            <Text style={[styles.swipeLabelText, { color: ACCENT }]}>NOPE</Text>
          </Animated.View>
        </Animated.View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionBtn} onPress={handleUndo}>
          <Undo2 size={18} color={TEXT_SECONDARY} />
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.finishBtn]} onPress={handleFinish}>
          <Flag size={16} color={ACCENT} />
          <Text style={styles.finishBtnText}>FINISH</Text>
        </Pressable>
      </View>

      <Modal visible={detailOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Pressable style={styles.modalClose} onPress={() => setDetailOpen(false)}>
              <X size={20} color={TEXT_PRIMARY} />
            </Pressable>
            <ScrollView showsVerticalScrollIndicator={false}>
              {currentMovie.poster && (
                <Image
                  source={{ uri: currentMovie.poster }}
                  style={styles.modalPoster}
                  resizeMode="cover"
                />
              )}
              <Text style={styles.modalTitle}>{currentMovie.title}</Text>
              <View style={[styles.movieMetaRow, { marginBottom: 16 }]}>
                {!!currentMovie.year && (
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>{currentMovie.year}</Text>
                  </View>
                )}
                {!!currentMovie.rating && (
                  <View style={styles.metaPill}>
                    <Star size={11} color="#FFC93C" fill="#FFC93C" />
                    <Text style={styles.metaPillText}>{currentMovie.rating}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.modalOverviewText}>{currentMovie.overview}</Text>

              {loadingDetails && (
                <ActivityIndicator color={ACCENT} style={{ marginTop: 20 }} />
              )}

              {details?.trailerKey && (
                <Pressable
                  style={styles.trailerBtn}
                  onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${details.trailerKey}`)}
                >
                  <Play size={16} color="#fff" fill="#fff" />
                  <Text style={styles.trailerBtnText}>WATCH TRAILER</Text>
                </Pressable>
              )}

              {details && details.cast.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>CAST</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                    {details.cast.map((c, i) => (
                      <View key={i} style={styles.castCard}>
                        {c.photo ? (
                          <Image source={{ uri: c.photo }} style={styles.castPhoto} />
                        ) : (
                          <View style={[styles.castPhoto, styles.castPhotoFallback]}>
                            <Text style={{ color: TEXT_SECONDARY, fontSize: 18 }}>?</Text>
                          </View>
                        )}
                        <Text style={styles.castName} numberOfLines={1}>{c.name}</Text>
                        <Text style={styles.castCharacter} numberOfLines={1}>{c.character}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG, paddingHorizontal: 20, paddingTop: 56 },
  centered: { justifyContent: "center", alignItems: "center", gap: 8 },

  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 32 },
  logo: { width: 32, height: 32, borderRadius: 10, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 14, fontWeight: "800", color: TEXT_PRIMARY, letterSpacing: 2 },

  h1: { fontSize: 34, fontWeight: "800", color: TEXT_PRIMARY, letterSpacing: -1, lineHeight: 40, marginBottom: 8 },
  subtitle: { fontSize: 14, color: TEXT_SECONDARY, marginBottom: 24 },

  genreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 30 },
  genreCard: {
    width: "47%",
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#222224",
  },
  genreIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: ACCENT_DIM,
    alignItems: "center",
    justifyContent: "center",
  },
  genreCardLabel: { fontSize: 13, fontWeight: "600", color: TEXT_PRIMARY, flexShrink: 1 },

  primaryBtn: { marginTop: 24, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 999, backgroundColor: ACCENT },
  primaryBtnText: { color: "#fff", fontSize: 13, fontWeight: "800", letterSpacing: 1 },

  swipeTopBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  backArrow: { fontSize: 22, color: TEXT_SECONDARY, fontWeight: "600" },
  genreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: ACCENT_DIM,
  },
  genreBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, color: ACCENT },
  counter: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: "600" },

  cardWrapper: { flex: 1, marginBottom: 14 },
  mainCard: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: "#222224",
  },
  poster: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  posterFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: SURFACE },
  cardGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" },

  cardInfo: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 20 },
  movieTitle: { fontSize: 24, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  movieMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  metaPillText: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "600" },
  movieOverview: { fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 18, marginTop: 10 },
  moreBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  moreBtnText: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.7)", letterSpacing: 0.5 },

  swipeLabel: { position: "absolute", top: 40, zIndex: 10, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 3 },
  likeLabel: { right: 20, borderColor: "#2ECC71" },
  passLabel: { left: 20, borderColor: ACCENT },
  swipeLabelText: { fontSize: 28, fontWeight: "900", letterSpacing: 2 },

  actionsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 16 },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SURFACE_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  finishBtn: {
    width: "auto",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: ACCENT_DIM,
  },
  finishBtnText: { fontSize: 11, fontWeight: "700", color: ACCENT, letterSpacing: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  modalClose: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalPoster: { width: "100%", height: 220, borderRadius: 16, marginBottom: 16 },
  modalTitle: { fontSize: 26, fontWeight: "800", color: TEXT_PRIMARY, letterSpacing: -0.5, marginBottom: 8 },
  modalOverviewText: { fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 21 },

  trailerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: ACCENT,
    alignSelf: "flex-start",
  },
  trailerBtnText: { fontSize: 12, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },

  sectionTitle: { fontSize: 13, fontWeight: "800", color: TEXT_PRIMARY, letterSpacing: 1, marginTop: 24, marginBottom: 12 },
  castCard: { width: 80, marginRight: 12, alignItems: "center" },
  castPhoto: { width: 60, height: 60, borderRadius: 30, marginBottom: 6, backgroundColor: SURFACE_LIGHT },
  castPhotoFallback: { alignItems: "center", justifyContent: "center" },
  castName: { fontSize: 11, fontWeight: "600", color: TEXT_PRIMARY, textAlign: "center" },
  castCharacter: { fontSize: 10, color: TEXT_SECONDARY, textAlign: "center" },
});