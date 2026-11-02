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
  ScrollView
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Avatar, NavBar, Screen, Stripes } from "../ui-kit";
import PickleIcon from "../PickleIcon";
import { C, F, MAX_WIDTH } from "../theme";
import { Movie } from "../../lib/tmdb";
import { EyeOff, Info } from "lucide-react-native";
import ProgressAvatar from "../ProgresssAvatar";
import CardBack from "../CardBack";

const SWIPE_THRESHOLD = 100;

/** ["Dill"] → "Dill", ["Dill","Brine","Spear"] → "Dill, Brine and Spear" */
const joinNames = (ns: string[]) =>
  ns.length <= 1 ? ns.join("") : `${ns.slice(0, -1).join(", ")} and ${ns[ns.length - 1]}`;
const firstSentence = (text: string) => (text.match(/^.*?[.!?](\s|$)/)?.[0] ?? text).trim();

// 05 Swipe: drag the card or tap the buttons
export default function SwipeScreen({
  genreTitle,
  deck,
  index,
  others,
  onBack,
  onSwipe,
  onUndo,
  onSeen,
  myName
}: {
  genreTitle: string;
  deck: Movie[];
  index: number; // how many cards I've swiped
  others: { name: string; index: number }[]; // everyone else in the room + how far they are
  onBack: () => void;
  onSwipe: (liked: boolean) => void;
  onUndo: () => void;
  onSeen: () => void;
  myName: string;
}) {
  const total = deck.length;
  const movie: Movie | undefined = deck[index];
  const done = index >= total;

  /* --- card motion ------------------------------------------------------- */
  const pan = useRef(new Animated.ValueXY()).current;
  const enter = useRef(new Animated.Value(1)).current; // 0 → 1 as a new card moves up
  const busy = useRef(false);
  const dragged = useRef(false); // so letting go of a drag doesn't count as a tap
  const exitX = Math.min(Dimensions.get("window").width, MAX_WIDTH) * 1.5;

  /* -- card flip ------------------------------------------------------- */
  const flip = useRef(new Animated.Value(0)).current; // 0 = poster side, 1 = details side
  const [flipped, setFlipped] = useState(false);

  const toggleFlip = () => {
    const to = flipped ? 0 : 1;
    setFlipped(!flipped);
    Animated.spring(flip, { toValue: to, friction: 8, tension: 60, useNativeDriver: false }).start();
  };

  // front turns 0° → 180°, back turns 180° → 360°, so they swap places
  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });
  // swap visibility exactly halfway, in case a browser ignores backfaceVisibility
  const frontOpacity = flip.interpolate({ inputRange: [0.49, 0.5], outputRange: [1, 0], extrapolate: "clamp" });
  const backOpacity = flip.interpolate({ inputRange: [0.5, 0.51], outputRange: [0, 1], extrapolate: "clamp" });

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
    flip.setValue(0);
    setFlipped(false);
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

  const waitingOn = others.filter((o) => o.index < total).map((o) => o.name);

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

      <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={s.people}
        >
          <ProgressAvatar name={myName} label="You" progress={index / Math.max(total, 1)} color={C.accent} />
          {others.map((o, i) => (
            <ProgressAvatar key={i} name={o.name} label={o.name} progress={o.index / Math.max(total, 1)} color={C.cream} />
          ))}
        </ScrollView>

      <View style={s.cardArea}>
        {!done && index + 1 < total && <View style={s.backCard} />}

        {done ? (
          <View style={[s.card, s.waitCard]}>
            <PickleIcon size={56} background={C.surface} />
            <Text style={s.waitTitle}>You're done!</Text>
            <Text style={s.waitSub}>
              {waitingOn.length === 0
                ? "Getting your matches…"
                : waitingOn.length > 3
                ? `Waiting for ${waitingOn.length} people to finish`
                : `Waiting for ${joinNames(waitingOn)} to finish`}
            </Text>
          </View>
        ) : (
          movie && (
            <Animated.View
              {...responder.panHandlers}
              style={[
                s.cardShell,
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
              {/* FRONT: poster */}
              <Animated.View
                pointerEvents={flipped ? "none" : "auto"}
                style={[s.face, { opacity: frontOpacity, transform: [{ perspective: 1000 }, { rotateY: frontRotate }] }]}
              >
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPressIn={() => (dragged.current = false)}
                  onPress={() => !dragged.current && toggleFlip()}
                >
                  <View style={s.posterBox}>
                    <Stripes />
                    {movie.poster && <Image source={{ uri: movie.poster }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
                    <LinearGradient
                      colors={["rgba(22,28,22,0)", C.surface]}
                      locations={[0.82, 1]}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>

                  <View style={s.info}>
                    <View style={s.titleRow}>
                      <Text style={[s.title, { flex: 1 }]} numberOfLines={2}>
                        {movie.title}
                      </Text>
                      <Pressable
                        accessibilityLabel="More info"
                        hitSlop={10}
                        onPress={toggleFlip}
                        style={({ pressed }) => [s.infoBtn, pressed && s.pressed]}
                      >
                        <Info size={16} color={C.cream} strokeWidth={2.4} />
                      </Pressable>
                    </View>
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
                    {!!(movie.tagline || movie.overview) && (
                      <Text style={s.hook} numberOfLines={2}>
                        {movie.tagline || firstSentence(movie.overview)}
                      </Text>
                    )}
                  </View>
                </Pressable>
              </Animated.View>

              {/* BACK: details */}
              <Animated.View
                pointerEvents={flipped ? "auto" : "none"}
                style={[s.face, { opacity: backOpacity, transform: [{ perspective: 1000 }, { rotateY: backRotate }] }]}
              >
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPressIn={() => (dragged.current = false)}
                  onPress={() => !dragged.current && toggleFlip()}
                >
                  <CardBack movie={movie} onFlipBack={toggleFlip} />
                </Pressable>
              </Animated.View>

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
 info: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 18, gap: 6, backgroundColor: C.surface },
  title: { fontFamily: F.displayHeavy, fontSize: 24, lineHeight: 26, letterSpacing: -0.48, color: C.cream },
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
    marginTop: -12, // tucks it closer to the Pass/Pick row
    marginBottom: 8,
    borderRadius: 999,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.chipLine,
  },
  seenText: { fontFamily: F.textSemi, fontSize: 13, color: C.muted },
  people: { flexGrow: 1, justifyContent: "center", gap: 8, paddingHorizontal: 24, paddingTop: 4 },
  hint: { fontFamily: F.textSemi, fontSize: 12, color: C.faint },
  hook: { fontFamily: F.textSemi, fontSize: 14, lineHeight: 20, color: C.body },
  posterBox: { flex: 1, overflow: "hidden" },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.surface2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  cardShell: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: C.surface,
    backfaceVisibility: "hidden",
  },
});