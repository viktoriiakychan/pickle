import { useLayoutEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Animated,
  PanResponder,
  Easing,
  Dimensions,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NavBar, Screen, Stripes } from "../ui-kit";
import PickleIcon from "../PickleIcon";
import MovieDetailsSheet from "./MovieDetailsSheet";
import { C, F, MAX_WIDTH } from "../theme";
import { Movie } from "../../lib/tmdb";
import { EyeOff } from "lucide-react-native";

const SWIPE_THRESHOLD = 100;

// 05 Swipe: drag the card or tap the buttons
export default function SwipeScreen({
  genreTitle,
  deck,
  index,
  friendName,
  friendIndex,
  onBack,
  onSwipe,
  onUndo,
  onSeen,
}: {
  genreTitle: string;
  deck: Movie[];
  index: number;         // how many cards I've swiped
  friendName: string;
  friendIndex: number;   // how many cards my friend has swiped
  onBack: () => void;
  onSwipe: (liked: boolean) => void;
  onUndo: () => void;
  onSeen: () => void;
}) {
  const total = deck.length;
  const movie: Movie | undefined = deck[index];
  const done = index >= total;
  const [details, setDetails] = useState<Movie | null>(null);

  /* ── card motion ─────────────────────────────────────────────────── */
  const pan = useRef(new Animated.ValueXY()).current;
  const enter = useRef(new Animated.Value(1)).current; // 0 → 1 as a new card moves up
  const busy = useRef(false);
  const dragged = useRef(false); // so letting go of a drag doesn't count as a tap
  const exitX = Math.min(Dimensions.get("window").width, MAX_WIDTH) * 1.5;

  const fling = (liked: boolean, dy = 0) => {
    if (busy.current || done) return;
    busy.current = true;
    Animated.timing(pan, {
      toValue: { x: liked ? exitX : -exitX, y: dy },
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => onSwipe(liked));
  };

  // when the top card changes (swipe or undo), snap the new one into place
  useLayoutEffect(() => {
    pan.setValue({ x: 0, y: 0 });
    busy.current = false;
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, friction: 7, tension: 90, useNativeDriver: false }).start();
  }, [index]);

  const flingRef = useRef(fling);
  flingRef.current = fling;

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        dragged.current = true;
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) flingRef.current(true, g.dy);
        else if (g.dx < -SWIPE_THRESHOLD) flingRef.current(false, g.dy);
        else Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start();
      },
      onPanResponderTerminate: () =>
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start(),
    })
  ).current;

  const rotate = pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ["-12deg", "0deg", "12deg"] });
  const pickOpacity = pan.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: "clamp" });
  const passOpacity = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: "clamp" });
  const enterScale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });
  const enterY = enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  const labelWidth = Math.max(28, Math.ceil(friendName.length * 6.8)); // fits "Gherkin" etc.
  const pct = (n: number) => `${Math.min(100, (n / Math.max(total, 1)) * 100)}%` as const;

  return (
    <Screen>
      <NavBar
        onBack={onBack}
        center={
          <View style={s.genrePill}>
            <Text style={s.genrePillText}>{genreTitle}</Text>
          </View>
        }
        right={
          <Text style={s.counter}>
            {Math.min(index + 1, total)}/{total}
          </Text>
        }
      />

      <View style={s.progress}>
        <View style={s.progressRow}>
          <Text style={[s.progressLabel, { width: labelWidth }]}>You</Text>
          <View style={s.track}>
            <View style={[s.fill, { width: pct(index), backgroundColor: C.accent }]} />
          </View>
        </View>
        <View style={s.progressRow}>
          <Text style={[s.progressLabel, { width: labelWidth }]} numberOfLines={1}>
            {friendName}
          </Text>
          <View style={s.track}>
            <View style={[s.fill, { width: pct(friendIndex), backgroundColor: C.cream }]} />
          </View>
        </View>
      </View>

      <View style={s.cardArea}>
        {!done && index + 1 < total && <View style={s.backCard} />}

        {done ? (
          <View style={[s.card, s.waitCard]}>
            <PickleIcon size={56} background={C.surface} />
            <Text style={s.waitTitle}>You're done!</Text>
            <Text style={s.waitSub}>
              Waiting for {friendName} to finish · {Math.min(friendIndex, total)}/{total}
            </Text>
          </View>
        ) : (
          movie && (
            <Animated.View
              {...responder.panHandlers}
              style={[
                s.card,
                {
                  transform: [
                    { translateX: pan.x },
                    { translateY: Animated.add(pan.y, enterY) },
                    { rotate },
                    { scale: enterScale },
                  ],
                },
              ]}
            >
              <Pressable
                style={StyleSheet.absoluteFill}
                onPressIn={() => (dragged.current = false)}
                onPress={() => !dragged.current && setDetails(movie)}
              >
                <Stripes />
                {movie.poster && <Image source={{ uri: movie.poster }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                <LinearGradient
                  colors={["rgba(13,17,13,0)", "rgba(13,17,13,0.96)"]}
                  locations={[0.4, 0.82]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={s.info}>
                  <Text style={s.title}>{movie.title}</Text>
                  <View style={s.meta}>
                    {[movie.year, movie.rating && `★ ${movie.rating}`, movie.runtime]
                      .filter(Boolean)
                      .flatMap((part, i) => (i ? ["·", part] : [part]))
                      .map((part, i) => (
                        <Text key={i} style={s.metaText}>
                          {part}
                        </Text>
                      ))}
                  </View>
                  {!!movie.overview && (
                    <Text style={s.overview} numberOfLines={4}>
                      {movie.overview}
                    </Text>
                  )}
                </View>
              </Pressable>

              <Animated.View pointerEvents="none" style={[s.stamp, s.stampPick, { opacity: pickOpacity }]}>
                <Text style={[s.stampText, { color: C.accent }]}>PICK</Text>
              </Animated.View>
              <Animated.View pointerEvents="none" style={[s.stamp, s.stampPass, { opacity: passOpacity }]}>
                <Text style={[s.stampText, { color: C.cream }]}>PASS</Text>
              </Animated.View>
            </Animated.View>
          )
        )}
      </View>

      <View style={s.actions}>
        <Pressable
          accessibilityLabel="Pass"
          disabled={done}
          onPress={() => fling(false)}
          style={({ pressed }) => [s.bigBtn, s.passBtn, done && s.off, pressed && s.pressed]}
        >
          <Text style={[s.bigBtnText, { color: C.cream }]}>Pass</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Undo"
          disabled={index === 0}
          onPress={onUndo}
          style={({ pressed }) => [s.undoBtn, pressed && s.pressed]}
        >
          <Text style={s.undoText}>↺</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Pick"
          disabled={done}
          onPress={() => fling(true)}
          style={({ pressed }) => [s.bigBtn, { backgroundColor: C.accent }, done && s.off, pressed && s.pressed]}
        >
          <Text style={[s.bigBtnText, { color: C.bg }]}>Pick</Text>
        </Pressable>
      </View>
      <Pressable
          accessibilityLabel="Already seen it"
          disabled={done}
          onPress={() => {
            onSeen();
            fling(false); // counts as a pass, so the card flies away
          }}
          style={({ pressed }) => [s.seenBtn, done && s.off, pressed && s.pressed]}
        >
          <EyeOff size={15} color={C.muted} strokeWidth={2.2} />
          <Text style={s.seenText}>Seen it already</Text>
        </Pressable>

      <MovieDetailsSheet movie={details} onClose={() => setDetails(null)} />
    </Screen>
  );
}

const s = StyleSheet.create({
  genrePill: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: C.pillGreen,
    justifyContent: "center",
  },
  genrePillText: { fontFamily: F.textBold, fontSize: 13, color: C.accent },
  counter: {
    width: 40,
    textAlign: "right",
    fontFamily: F.mono,
    fontSize: 13,
    color: C.muted,
  },

  progress: { paddingTop: 4, paddingHorizontal: 24, gap: 8 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressLabel: { width: 28, fontFamily: F.text, fontSize: 12, color: C.muted },
  track: { flex: 1, height: 4, borderRadius: 9, backgroundColor: C.surface2, overflow: "hidden" },
  fill: { height: "100%" },

  cardArea: { flex: 1, marginTop: 16, marginHorizontal: 20 },
  backCard: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    bottom: 0,
    borderRadius: 28,
    backgroundColor: C.surface,
    transform: [{ scale: 0.95 }, { translateY: 10 }],
  },
  card: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: C.surface,
  },
  info: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 20, gap: 8 },
  title: { fontFamily: F.displayHeavy, fontSize: 28, lineHeight: 29.4, letterSpacing: -0.56, color: C.cream },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaText: { fontFamily: F.textSemi, fontSize: 13, color: C.muted },
  overview: { fontFamily: F.text, fontSize: 14, lineHeight: 20.3, color: C.body },

  stamp: {
    position: "absolute",
    top: 22,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2.5,
  },
  stampPick: { left: 20, borderColor: C.accent, transform: [{ rotate: "-12deg" }] },
  stampPass: { right: 20, borderColor: C.cream, transform: [{ rotate: "12deg" }] },
  stampText: { fontFamily: F.textHeavy, fontSize: 22 },

  waitCard: { alignItems: "center", justifyContent: "center", gap: 10, padding: 28 },
  waitTitle: { fontFamily: F.displayHeavy, fontSize: 28, letterSpacing: -0.56, color: C.cream, marginTop: 6 },
  waitSub: { fontFamily: F.text, fontSize: 14, lineHeight: 20.3, color: C.muted, textAlign: "center" },

  actions: { height: 116, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20 },
  bigBtn: { width: 64, height: 64, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  passBtn: { borderWidth: 1.5, borderColor: C.line },
  bigBtnText: { fontFamily: F.textBold, fontSize: 15 },
  undoBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  undoText: { fontSize: 18, color: C.muted },
  off: { opacity: 0.35 },
  pressed: { transform: [{ scale: 0.94 }] },

  seenBtn: {
  alignSelf: "center",
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  height: 34,
  paddingHorizontal: 14,
  marginTop: -12,          // tucks it closer to the Pass/Pick row
  marginBottom: 8,
  borderRadius: 999,
  backgroundColor: C.surface,
  borderWidth: 1,
  borderColor: C.chipLine,
  },
  seenText: { fontFamily: F.textSemi, fontSize: 13, color: C.muted },
});
