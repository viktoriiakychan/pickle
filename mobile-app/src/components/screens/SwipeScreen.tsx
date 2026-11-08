import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Image as ExpoImage } from "expo-image";
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
import { Avatar, NavBar, Screen, Stripes, MovieMeta } from "../ui-kit";
import PickleIcon from "../PickleIcon";
import { C, F, MAX_WIDTH } from "../theme";
import { Movie } from "../../lib/tmdb";
import { ArrowLeft, ArrowRight, ChevronDown, EyeOff, Info, Undo2 } from "lucide-react-native";
import ProgressAvatar from "../ProgressAvatar";
import CardBack from "../CardBack";
import { bumpCount, getCount, hasFlag, setFlag } from "../../lib/identity";

const SWIPE_THRESHOLD = 100;
const FLICK_SPEED = 0.6; // px/ms: a flick this fast counts as a swipe even if it's short
const buzz = () => { try { (globalThis as any).navigator?.vibrate?.(8); } catch {} };
const HINT_KEY = "swipeHint";
const HINT_MAX = 2; // swipe demo plays on the first 2 swipe screens, then never again
const UNDO_FLAG = "undoTip"; // "Changed your mind?" bubble, shown once ever

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
  tagFor,
  genreDetails,
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
  tagFor?: (m: Movie) => string | null; // "Brine's pick", "Romance + Horror blend"…
  genreDetails?: { who: string; what: string; no?: boolean }[]; // tap the top pill to see everyone's picks
  myName: string;
}) {
  const total = deck.length;
  const [showGenres, setShowGenres] = useState(false);
  const movie: Movie | undefined = deck[index];
  const done = index >= total;

  /* --- card motion ------------------------------------------------------- */
  const pan = useRef(new Animated.ValueXY()).current;
  const busy = useRef(false);
  const dragged = useRef(false); // so letting go of a drag doesn't count as a tap
  const exitX = Math.min(Dimensions.get("window").width, MAX_WIDTH) * 1.5;

  /* -- first-time demo: wiggle the card right, then left ------------- */
  const [showHint, setShowHint] = useState(() => getCount(HINT_KEY) < HINT_MAX);
  const hintCounted = useRef(false); // so one showing only counts once
  const hintAnim = useRef<Animated.CompositeAnimation | null>(null);

  const stopHint = () => {
    if (!showHint) return;
    hintAnim.current?.stop();
    hintAnim.current = null;
    if (!hintCounted.current) {
      hintCounted.current = true;
      bumpCount(HINT_KEY);
    }
    setShowHint(false);
    if (!busy.current) pan.setValue({ x: 0, y: 0 }); // snap the card back to the middle
  };
  const stopHintRef = useRef(stopHint);
  stopHintRef.current = stopHint;

  useEffect(() => {
    if (!showHint || done) return;
    const move = (x: number, ms: number) =>
      Animated.timing(pan.x, { toValue: x, duration: ms, easing: Easing.inOut(Easing.cubic), useNativeDriver: false });

    hintAnim.current = Animated.sequence([
      Animated.delay(400),
      move(80, 450), Animated.delay(500), move(0, 300),   // right: "Pick" pill fades in with the card
      Animated.delay(150),
      move(-80, 450), Animated.delay(500), move(0, 300),  // left: "Pass" pill
    ]);
    hintAnim.current.start(({ finished }) => finished && stopHint());
    return () => hintAnim.current?.stop();
  }, []);

  /* -- undo tip: right after the first swipe, once ever ---------------- */
  const undoTip = useRef(new Animated.Value(0)).current;
  const [showUndoTip, setShowUndoTip] = useState(false);
  useEffect(() => {
    if (index !== 1 || hasFlag(UNDO_FLAG)) return;
    setFlag(UNDO_FLAG);
    setShowUndoTip(true);
    const a = Animated.sequence([
      Animated.timing(undoTip, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.delay(2400),
      Animated.timing(undoTip, { toValue: 0, duration: 300, useNativeDriver: false }),
    ]);
    a.start(() => setShowUndoTip(false));
    return () => a.stop();
  }, [index]);

  /* -- card flip ------------------------------------------------------- */
  const flip = useRef(new Animated.Value(0)).current; // 0 = poster side, 1 = details side
  const [flipped, setFlipped] = useState(false);

  // looked at this poster for 1.5s → start loading its trailer in the background (paused)
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    setWarm(false);
    const t = setTimeout(() => setWarm(true), 1500);
    return () => clearTimeout(t); // swiped before 1.5s → never loads
  }, [index]);

  const [area, setArea] = useState({ w: 0, h: 0 });
  const INFO_H = 96;
  const POSTER_RATIO = 1.5; // real poster shape
  const cardW = area.w
    ? Math.min(area.w, Math.max(area.w * 0.75, (area.h - INFO_H) / POSTER_RATIO))
    : undefined;

  const toggleFlip = () => {
    stopHint();
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

  /* -- throwing the card ------------------------------------------------ */
  const queued = useRef<boolean | null>(null); // a Pick/Pass tapped mid-animation, played next

  const fling = (liked: boolean, dy = 0, vx = 0) => {
    if (done) return;
    stopHint();
    if (busy.current) {
      queued.current = liked;
      return;
    }
    busy.current = true;
    const speed = Math.max(Math.abs(vx), 2);
    const duration = Math.min(340, Math.max(240, exitX / speed));
    Animated.timing(pan, {
      toValue: { x: liked ? exitX : -exitX, y: dy - 20 },
      duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => onSwipe(liked));
  };

  // when the top card changes (swipe or undo), snap the new one into place
  useLayoutEffect(() => {
    pan.setValue({ x: 0, y: 0 });
    flip.setValue(0);
    setFlipped(false);
    busy.current = false;
    if (queued.current !== null) {
      const liked = queued.current;
      queued.current = null;
      fling(liked);
    }
  }, [index]);

  // download the next few posters in the background so they appear instantly
  useEffect(() => {
    const upcoming = deck
      .slice(index + 1, index + 6)
      .map((m) => m.poster)
      .filter((p): p is string => !!p);
    if (upcoming.length) ExpoImage.prefetch(upcoming).catch(() => {});
  }, [index, deck]);

  const flingRef = useRef(fling);
  flingRef.current = fling;

  const crossed = useRef(false); // already buzzed for this drag?
  const track = Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false });

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        dragged.current = true;
        crossed.current = false;
        stopHintRef.current();
      },
      onPanResponderMove: (e, g) => {
        track(e, g); // card follows your finger
        const past = Math.abs(g.dx) > SWIPE_THRESHOLD;
        if (past && !crossed.current) buzz(); // buzz once when you cross the line
        crossed.current = past;
      },
      onPanResponderRelease: (_, g) => {
        const flick = Math.abs(g.vx) > FLICK_SPEED && Math.abs(g.dx) > 40 && Math.sign(g.vx) === Math.sign(g.dx);
        if (g.dx > SWIPE_THRESHOLD || (flick && g.dx > 0)) flingRef.current(true, g.dy, g.vx);
        else if (g.dx < -SWIPE_THRESHOLD || (flick && g.dx < 0)) flingRef.current(false, g.dy, g.vx);
        else Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, tension: 140, useNativeDriver: false }).start();
      },
      onPanResponderTerminate: () =>
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, tension: 140, useNativeDriver: false }).start(),
    })
  ).current;

  const rotate = pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ["-12deg", "0deg", "12deg"] });
  const pickOpacity = pan.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: "clamp" });
  const passOpacity = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: "clamp" });

  // demo pills follow the card: lean right → "Pick" pill, lean left → "Pass" pill
  const hintRight = pan.x.interpolate({ inputRange: [0, 60], outputRange: [0, 1], extrapolate: "clamp" });
  const hintLeft = pan.x.interpolate({ inputRange: [-60, 0], outputRange: [1, 0], extrapolate: "clamp" });
  // pills drift a little the same way as the card (no tilt), so they feel attached to the motion
  const hintSlide = pan.x.interpolate({ inputRange: [-80, 0, 80], outputRange: [-12, 0, 12], extrapolate: "clamp" });

  // next card sits underneath and grows into place as you drag the top one away
  const away = pan.x.interpolate({ inputRange: [-150, 0, 150], outputRange: [1, 0, 1], extrapolate: "clamp" });
  const backScale = away.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const backY = away.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const backDim = away.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  // hide the next card while flipping / reading the info side (it peeked through mid-turn)
  const backHide = flip.interpolate({ inputRange: [0, 0.05], outputRange: [1, 0], extrapolate: "clamp" });

  // stamps pop in, not just fade
  const pickScale = pan.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0.6, 1], extrapolate: "clamp" });
  const passScale = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0.6], extrapolate: "clamp" });

  const waitingOn = others.filter((o) => o.index < total).map((o) => o.name);

  /* -- one card in the stack (depth 0 = top, 1 = underneath, 2 = hidden, preloading) -- */
  const stack = deck.slice(index, index + 3);

  const renderCard = (m: Movie, depth: number) => {
    const top = depth === 0;
    return (
      <Animated.View
        key={m.id}
        pointerEvents={top ? "auto" : "none"}
        {...(top ? responder.panHandlers : {})}
        style={[
          s.cardShell,
          { zIndex: 10 - depth },
          top
            ? { opacity: 1, transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }, { scale: 1 }] }
            : {
                // underneath: smaller + dimmed, grows as you drag the top card away.
                // hidden while the top card is flipping (it peeked through mid-turn)
                opacity: depth === 1 ? backHide : 0,
                transform: [{ translateX: 0 }, { translateY: backY }, { rotate: "0deg" }, { scale: backScale }],
              },
        ]}
      >
        {/* FRONT: poster */}
        <Animated.View
          pointerEvents={top && !flipped ? "auto" : "none"}
          style={[
            s.face,
            top
              ? { opacity: frontOpacity, transform: [{ perspective: 1000 }, { rotateY: frontRotate }] }
              : { opacity: 1, transform: [{ perspective: 1000 }, { rotateY: "0deg" }] },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            disabled={!top}
            onPressIn={() => (dragged.current = false)}
            onPress={() => !dragged.current && toggleFlip()}
          >
            <View style={s.posterBox}>
              <Stripes />
              {m.poster && (
                <ExpoImage
                  source={{ uri: m.poster }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  contentPosition="top"
                  transition={150}
                />
              )}
              <LinearGradient
                colors={["rgba(22,28,22,0)", C.surface]}
                locations={[0.82, 1]}
                style={StyleSheet.absoluteFill}
              />
              {!!tagFor?.(m) && (
                <View style={s.tag} pointerEvents="none">
                  <Text style={s.tagText}>{tagFor(m)}</Text>
                </View>
              )}
            </View>

            <View style={s.info}>
              <View style={s.titleRow}>
                <Text style={[s.title, { flex: 1 }]} numberOfLines={2}>
                  {m.title}
                </Text>
                <Pressable
                  accessibilityLabel="More info"
                  hitSlop={10}
                  disabled={!top}
                  onPress={toggleFlip}
                  style={({ pressed }) => [s.infoBtn, pressed && s.pressed]}
                >
                  <Info size={16} color={C.cream} strokeWidth={2.4} />
                </Pressable>
              </View>
                <MovieMeta movie={m} />
              {!!(m.tagline || m.overview) && (
                <Text style={s.hook} numberOfLines={2}>
                  {m.tagline || firstSentence(m.overview)}
                </Text>
              )}
            </View>
          </Pressable>
        </Animated.View>

        {/* BACK: details (top card only) */}
        {top && (
          <Animated.View
            pointerEvents={flipped ? "auto" : "none"}
            style={[s.face, { opacity: backOpacity, transform: [{ perspective: 1000 }, { rotateY: backRotate }] }]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPressIn={() => (dragged.current = false)}
              onPress={() => !dragged.current && toggleFlip()}
            >
              <CardBack movie={m} onFlipBack={toggleFlip} active={flipped} warm={warm} />
            </Pressable>
          </Animated.View>
        )}

        {top && (
          <Animated.View
            pointerEvents="none"
            style={[s.stamp, s.stampPick, { opacity: pickOpacity, transform: [{ rotate: "-12deg" }, { scale: pickScale }] }]}
          >
            <Text style={[s.stampText, { color: C.accent }]}>PICK</Text>
          </Animated.View>
        )}
        {top && (
          <Animated.View
            pointerEvents="none"
            style={[s.stamp, s.stampPass, { opacity: passOpacity, transform: [{ rotate: "12deg" }, { scale: passScale }] }]}
          >
            <Text style={[s.stampText, { color: C.cream }]}>PASS</Text>
          </Animated.View>
        )}

        {/* dark layer on the card underneath, fades away as it grows */}
        <Animated.View
          pointerEvents="none"
          style={[s.face, { backgroundColor: C.bg, opacity: top ? 0 : backDim }]}
        />
      </Animated.View>
    );
  };

  return (
    <Screen>
      <NavBar
        onBack={onBack} backLabel="Leave"
        center={
          <Pressable
            disabled={!genreDetails?.length}
            onPress={() => setShowGenres((v) => !v)}
            hitSlop={8}
            style={({ pressed }) => [s.genrePill, pressed && s.pressed]}
          >
            <Text style={s.genrePillText} numberOfLines={1}>
              {genreTitle}
            </Text>
            {!!genreDetails?.length && (
              <View style={{ transform: [{ rotate: showGenres ? "180deg" : "0deg" }] }}>
                <ChevronDown size={14} color={C.accent} strokeWidth={2.6} />
              </View>
            )}
          </Pressable>
        }
        right={
          <Text style={s.counter}>
            {Math.min(index + 1, total)}/{total}
          </Text>
        }
      />

      {/* everyone's genre picks, opened by tapping the pill */}
      <View style={{ zIndex: 30 }}>
        {showGenres && !!genreDetails?.length && (
          <Pressable style={s.genrePanel} onPress={() => setShowGenres(false)}>
            {genreDetails.map((d, i) => (
              <View key={i} style={s.genreLine}>
                <Text style={[s.genreWho, d.no && { color: "#FF7A6B" }]}>{d.who}</Text>
                <Text style={s.genreWhat}>{d.what}</Text>
              </View>
            ))}
          </Pressable>
        )}
      </View>

      {others.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={s.people}
        >
          <ProgressAvatar size={22} name={myName} label="You" progress={index / Math.max(total, 1)} color={C.accent} />
          {others.map((o, i) => (
            <ProgressAvatar key={i} size={22} name={o.name} label={o.name} progress={o.index / Math.max(total, 1)} color={C.cream} />
          ))}
        </ScrollView>
      )}

      <View
        style={s.cardArea}
        onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        <View style={{ flex: 1, width: cardW, alignSelf: "center" }}>
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
            // The stack: top card, the one underneath, and one more hidden one.
            // Each card is keyed by movie id, so when you swipe, the card underneath
            // (poster already loaded) *becomes* the top card instead of a new one loading.
            stack.map((m, depth) => renderCard(m, depth))
          )}

          {showHint && !done && (
            <>
              <Animated.View
                pointerEvents="none"
                style={[s.hint, { zIndex: 20, opacity: hintRight, transform: [{ translateX: hintSlide }] }]}
              >
                <Text style={s.hintText}>Swipe right to Pick</Text>
                <ArrowRight size={16} color={C.bg} strokeWidth={2.6} />
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[s.hint, s.hintPass, { zIndex: 20, opacity: hintLeft, transform: [{ translateX: hintSlide }] }]}
              >
                <ArrowLeft size={16} color={C.bg} strokeWidth={2.6} />
                <Text style={s.hintText}>Swipe left to Pass</Text>
              </Animated.View>
            </>
          )}
        </View>
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

        <View>
          {showUndoTip && (
            <Animated.View
              pointerEvents="none"
              style={[
                s.undoTip,
                {
                  opacity: undoTip,
                  transform: [{ translateY: undoTip.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
                },
              ]}
            >
              <View style={s.undoTipBubble}>
                <Text style={s.undoTipText} numberOfLines={1}>
                  Changed your mind? Undo
                </Text>
              </View>
              <View style={s.undoTipArrow} />
            </Animated.View>
          )}

          <Pressable
            accessibilityLabel="Undo"
            disabled={index === 0}
            onPress={() => !busy.current && onUndo()}
            style={({ pressed }) => [s.undoBtn, index === 0 && s.off, pressed && s.pressed]}
          >
            <Undo2 size={20} color={C.cream} strokeWidth={2.4} />
          </Pressable>
        </View>

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
        accessibilityLabel="I've already seen it"
        disabled={done}
        hitSlop={8}
        onPress={() => {
          if (busy.current) return; // otherwise it marks the card that's already flying away
          onSeen();
          fling(false); // counts as a pass
        }}
        style={({ pressed }) => [s.seenBtn, done && s.off, pressed && s.pressed]}
      >
        <EyeOff size={14} color={C.muted} strokeWidth={2.2} />
        <Text style={s.seenText}>I've already seen it</Text>
      </Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  genrePanel: {
    position: "absolute",
    top: 4,
    left: 24,
    right: 24,
    padding: 16,
    gap: 10,
    borderRadius: 20,
    backgroundColor: C.surface2,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  genreLine: { flexDirection: "row", gap: 10 },
  genreWho: { width: 90, fontFamily: F.textBold, fontSize: 14, color: C.accent },
  genreWhat: { flex: 1, fontFamily: F.textSemi, fontSize: 14, color: C.cream },
  genrePill: {
    maxWidth: "56%", // long names end in "…" instead of pushing into the Leave button
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: C.pillGreen,
  },
  tag: {
    position: "absolute",
    left: 14,
    bottom: 12,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(13,17,13,0.78)",
    justifyContent: "center",
  },
  tagText: { fontFamily: F.textBold, fontSize: 12, color: C.accent },
  genrePillText: { flexShrink: 1, fontFamily: F.textBold, fontSize: 13, color: C.accent },
  counter: {
    width: 40,
    textAlign: "right",
    fontFamily: F.mono,
    fontSize: 13,
    color: C.muted,
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
    backgroundColor: "rgba(13,17,13,0.6)", // dark see-through, so the stamp reads on any poster
  },
  
  stampPick: { left: 20, borderColor: C.accent, transform: [{ rotate: "-12deg" }] },
  stampPass: { right: 20, borderColor: C.cream, transform: [{ rotate: "12deg" }] },
  stampText: { fontFamily: F.textHeavy, fontSize: 22 },

  waitCard: { alignItems: "center", justifyContent: "center", gap: 10, padding: 28 },
  waitTitle: { fontFamily: F.displayHeavy, fontSize: 28, letterSpacing: -0.56, color: C.cream, marginTop: 6 },
  waitSub: { fontFamily: F.text, fontSize: 14, lineHeight: 20.3, color: C.muted, textAlign: "center" },

  actions: { height: 76, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20 },
  seenBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderRadius: 999,
    backgroundColor: C.surface,
  },
  seenText: { fontFamily: F.textSemi, fontSize: 13, color: C.muted },

  bigBtn: { width: 58, height: 58, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  cardArea: { flex: 1, marginTop: 8, marginHorizontal: 20 },
  info: { paddingHorizontal: 18, paddingTop: 2, paddingBottom: 14, gap: 4, backgroundColor: C.surface },
  title: { fontFamily: F.displayHeavy, fontSize: 20, lineHeight: 22, letterSpacing: -0.4, color: C.cream },
  hook: { fontFamily: F.textSemi, fontSize: 13, lineHeight: 18, color: C.body },
  people: { flexGrow: 1, justifyContent: "center", gap: 8, paddingHorizontal: 24 },

  passBtn: { borderWidth: 1.5, borderColor: C.line },
  bigBtnText: { fontFamily: F.textBold, fontSize: 15 },
  undoBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: C.surface2,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  undoTip: { position: "absolute", bottom: 54, left: -78, width: 200, alignItems: "center", zIndex: 40 },
  undoTipBubble: { height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.cream, justifyContent: "center" },
  undoTipText: { fontFamily: F.textBold, fontSize: 13, color: C.bg },
  undoTipArrow: { width: 10, height: 10, marginTop: -5, backgroundColor: C.cream, transform: [{ rotate: "45deg" }] },
  off: { opacity: 0.35 },
  pressed: { transform: [{ scale: 0.94 }] },
  hint: {
    position: "absolute",
    alignSelf: "center",
    top: "40%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 999,
    backgroundColor: C.accent,
  },
  hintText: { fontFamily: F.textBold, fontSize: 14, color: C.bg },
  hintPass: { backgroundColor: C.cream },
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