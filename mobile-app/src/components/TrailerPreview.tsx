import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated, Easing, Linking, Platform, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ExternalLink, Play, Volume2, VolumeX } from "lucide-react-native";
import { C, F } from "./theme";

// Muted trailer preview, Netflix-style. Web only for now (on the phone app it shows nothing).
// warm   = load the player early, paused (they've been looking at the poster for a bit)
// active = this side is showing: play it. Flipping back pauses, mutes and rewinds it.
const SKIP_INTRO = 10; // seconds: skips most studio-logo intros…
const SHORT_VIDEO = 30; // …but videos this short (teasers) start from 0:00
const FALLBACK_MS = 3000; // if YouTube never tells us it's playing, show the video anyway

// Android Chrome treats a sideways drag as its own gesture (scroll / back) and cancels our touch,
// so the card underneath thinks it's a swipe. "touch-action: none" tells the browser to keep out.
const NO_BROWSER_GESTURES = (Platform.OS === "web" ? { touchAction: "none" } : {}) as object;

/** 151 → "2:31" */
const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/** Small spinning ring for "Loading trailer" */
function Spinner() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: false })
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return <Animated.View style={[s.spinner, { transform: [{ rotate }] }]} />;
}

export default function TrailerPreview({
  videoKey,
  backdrop,
  warm = false,
  active = true,
}: {
  videoKey: string;
  backdrop?: string | null; // still image shown until the video is actually playing
  warm?: boolean;
  active?: boolean;
}) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const ready = useRef(false); // player finished loading?
  const heard = useRef(false); // has YouTube sent us any player state?
  const activeRef = useRef(active);
  activeRef.current = active;

  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [broken, setBroken] = useState(false);
  const [time, setTime] = useState(0); // seconds into the trailer (from YouTube)
  const [duration, setDuration] = useState(0); // trailer length in seconds (0 = not known yet)

  // where this trailer starts: 0:10, or 0:00 for short teasers
  const startAt = duration && duration <= SHORT_VIDEO ? 0 : SKIP_INTRO;
  const startAtRef = useRef(SKIP_INTRO);
  startAtRef.current = startAt;

  const cover = useRef(new Animated.Value(1)).current; // 1 = backdrop showing, 0 = video showing
  const progress = useRef(new Animated.Value(0)).current; // 0 → 1, the line under the video
  const barIn = useRef(new Animated.Value(0)).current; // fades the line + time in once we know the length

  // scrubbing: drag / tap the line to jump around, like YouTube
  const [barW, setBarW] = useState(0);
  const dragging = useRef(false);
  const [dragTime, setDragTime] = useState<number | null>(null); // time shown while dragging

  const send = (func: string, args: unknown[] = []) =>
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");

  const play = () => {
    send("playVideo");
    // safety net: if YouTube never reports "playing", fade the backdrop away anyway
    setTimeout(() => {
      if (!heard.current && activeRef.current) setPlaying(true);
    }, FALLBACK_MS);
  };

  // new trailer → start fresh
  useEffect(() => {
    ready.current = false;
    heard.current = false;
    setMuted(true);
    setPlaying(false);
    setUserPaused(false);
    setBroken(false);
    setTime(0);
    setDuration(0);
    progress.setValue(0);
    barIn.setValue(0);
    shortChecked.current = false;
  }, [videoKey]);

  // flip to the info side → play (muted)
  // flip back to the poster → pause, mute, and rewind so next time starts fresh
  useEffect(() => {
    if (!active) {
      send("pauseVideo");
      send("seekTo", [startAtRef.current, true]);
      send("mute");
      setMuted(true);
      setUserPaused(false);
      setTime(startAtRef.current);
      return;
    }
    if (ready.current) play(); // not loaded yet? onLoad below starts it
  }, [active]);

  // short teaser? once we know its length and position, jump back to 0:00 (usually before anyone sees it)
  const shortChecked = useRef(false);
  useEffect(() => {
    if (shortChecked.current || !duration || time <= 0) return;
    shortChecked.current = true;
    if (duration <= SHORT_VIDEO && time >= SKIP_INTRO - 1) {
      send("seekTo", [0, true]);
      setTime(0);
    }
  }, [duration, time]);

  // line + time fade in gently the first time we know the length
  useEffect(() => {
    if (duration) Animated.timing(barIn, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [duration > 0]);

  // the line follows the real time: every update from YouTube puts it in the right place,
  // and while playing it keeps moving on its own at real speed until the next update
  useEffect(() => {
    if (!duration || dragging.current) return;
    const at = Math.min(Math.max(time, startAt), duration);
    progress.stopAnimation();
    progress.setValue(at / duration);
    if (playing && at < duration) {
      Animated.timing(progress, {
        toValue: 1,
        duration: (duration - at) * 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    }
  }, [time, duration, playing, startAt]);

  // backdrop fades out once the video is really playing, and back in when it's paused
  useEffect(() => {
    Animated.timing(cover, { toValue: playing ? 0 : 1, duration: 250, useNativeDriver: false }).start();
  }, [playing]);

  // messages from *this* player: playing? how far in? how long? can't be embedded?
  useEffect(() => {
    if (Platform.OS !== "web" || !(warm || active)) return;
    const onMessage = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      let data: any;
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (data?.event === "onError") setBroken(true);
      // YouTube player states: 1 = playing, 2 = paused, 3 = buffering, 0 = ended, -1 = not started
      const state = typeof data?.info === "number" ? data.info : data?.info?.playerState;
      if (typeof state === "number") {
        heard.current = true;
        setPlaying(state === 1);
      }
      const info = data?.info;
      if (info && typeof info === "object") {
        if (typeof info.duration === "number" && info.duration > 0) setDuration(info.duration);
        if (typeof info.currentTime === "number" && !dragging.current) setTime(info.currentTime);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [warm, active, videoKey]);

  // not looked at long enough and not flipped → load nothing
  if (Platform.OS !== "web" || broken || !(warm || active)) return null;

  const togglePlay = () => {
    if (playing) {
      setUserPaused(true);
      setPlaying(false); // switch straight away, don't wait for YouTube
      send("pauseVideo");
    } else {
      setUserPaused(false);
      play();
    }
  };

  const toggleSound = () => {
    send(muted ? "unMute" : "mute");
    setMuted(!muted);
  };

  const loading = active && !playing && !userPaused;

  // finger x on the line → 0..1, and move the line there straight away
  const scrubTo = (x: number) => {
    const f = Math.min(Math.max(x / Math.max(barW, 1), 0), 1);
    progress.stopAnimation();
    progress.setValue(f);
    setDragTime(f * duration);
    return f;
  };

  // autoplay=0: loads paused; we press play ourselves when this side is showing
  const src =
    `https://www.youtube-nocookie.com/embed/${videoKey}` +
    `?autoplay=0&mute=1&playsinline=1&start=${SKIP_INTRO}` +
    `&controls=0&disablekb=1&fs=0&rel=0&iv_load_policy=3&cc_load_policy=0` +
    `&loop=1&playlist=${videoKey}&enablejsapi=1`;

  return (
    <View
      style={{ gap: 8 }}
      // On web, buttons fire on the browser's "click", which bubbles up to the card's
      // "tap to flip back". Stopping it here means taps on the video, the line or the time
      // never flip the card, but taps anywhere else on the card still do.
      {...(Platform.OS === "web" ? ({ onClick: (e: any) => e.stopPropagation() } as any) : {})}
    >
      {/* tap the video = pause / play */}
      <Pressable onPress={togglePlay} style={s.box} accessibilityLabel={playing ? "Pause trailer" : "Play trailer"}>
        <iframe
          ref={frame}
          src={src}
          title="Trailer"
          allow="autoplay; encrypted-media; picture-in-picture"
          onLoad={() => {
            ready.current = true;
            // ask YouTube to send us its state (playing / paused / time / error)
            frame.current?.contentWindow?.postMessage(
              JSON.stringify({ event: "listening", id: videoKey, channel: "widget" }),
              "*"
            );
            if (activeRef.current) play(); // flipped before it finished loading
          }}
          style={{ width: "100%", height: "100%", border: 0, pointerEvents: "none" }}
        />

        {/* backdrop until it's actually playing, so you never see YouTube's loading/paused screen */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: cover }]}>
          {backdrop ? (
            <ExpoImage source={{ uri: backdrop }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: C.surface2 }]} />
          )}
          <LinearGradient colors={["rgba(13,17,13,0.05)", "rgba(13,17,13,0.55)"]} style={StyleSheet.absoluteFill} />
          <View style={s.coverCentre}>
            {loading ? (
              <View style={s.loadingPill}>
                <Spinner />
                <Text style={s.loadingText}>Loading trailer</Text>
              </View>
            ) : (
              <View style={s.bigPlay}>
                <View style={{ paddingLeft: 3 }}>
                  <Play size={20} color={C.cream} fill={C.cream} strokeWidth={0} />
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* sound button, top-right (YouTube's own logo is bottom-right, so we stay clear of it) */}
        {!loading && (
          <Pressable
            onPress={toggleSound}
            accessibilityLabel={muted ? "Turn sound on" : "Mute"}
            hitSlop={8}
            style={({ pressed }) => [s.soundBtn, pressed && s.pressed]}
          >
            {muted ? (
              <VolumeX size={14} color={C.cream} strokeWidth={2.4} />
            ) : (
              <Volume2 size={14} color={C.cream} strokeWidth={2.4} />
            )}
          </Pressable>
        )}
      </Pressable>

      {/* progress line: tap or drag it to jump around. Always takes its space (so nothing jumps),
          fades in once we know the length. */}
      <Animated.View
        style={[s.scrub, NO_BROWSER_GESTURES, { opacity: barIn }]}
        onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => duration > 0}
        onMoveShouldSetResponder={() => duration > 0}
        onResponderTerminationRequest={() => false} // don't let the card steal the drag and swipe away
        onResponderGrant={(e) => {
          dragging.current = true;
          scrubTo(e.nativeEvent.locationX);
        }}
        onResponderMove={(e) => scrubTo(e.nativeEvent.locationX)}
        onResponderRelease={(e) => {
          const sec = scrubTo(e.nativeEvent.locationX) * duration;
          send("seekTo", [sec, true]);
          dragging.current = false;
          setDragTime(null);
          setTime(sec); // the line carries on from here
        }}
      >
        <View style={s.track} pointerEvents="none">
          <Animated.View
            style={[s.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]}
          />
        </View>
        <Animated.View
          pointerEvents="none"
          style={[
            s.knob,
            dragTime !== null && s.knobBig,
            { left: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) },
          ]}
        />
      </Animated.View>

      <View style={s.below}>
        <Animated.Text style={[s.timeText, { opacity: barIn }]}>
          {duration > 0 ? `${fmt(dragTime ?? Math.max(time, startAt))} / ${fmt(duration)}` : " "}
        </Animated.Text>
        <Pressable
          onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${videoKey}`)}
          hitSlop={8}
          style={({ pressed }) => [s.ytLink, pressed && { opacity: 0.6 }]}
        >
          <Text style={s.ytText}>Watch on YouTube</Text>
          <ExternalLink size={12} color={C.muted} strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { width: "100%", aspectRatio: 16 / 9, borderRadius: 16, overflow: "hidden", backgroundColor: "#000" },
  coverCentre: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  loadingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(13,17,13,0.65)",
    borderWidth: 1,
    borderColor: "rgba(240,240,228,0.15)",
  },
  loadingText: { fontFamily: F.textSemi, fontSize: 13, color: C.cream },
  spinner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(240,240,228,0.25)",
    borderTopColor: C.accent,
  },
  bigPlay: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(13,17,13,0.6)",
    borderWidth: 1.5,
    borderColor: "rgba(240,240,228,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  soundBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(13,17,13,0.65)",
    borderWidth: 1,
    borderColor: "rgba(240,240,228,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  // big invisible touch area around the thin line (36px tall: easy to grab with a thumb on any phone).
  // The negative margin keeps the gap to the video and the time text looking the same as before.
  scrub: { height: 36, justifyContent: "center", marginVertical: -15 },
  track: { height: 4, borderRadius: 2, backgroundColor: C.surface2, overflow: "hidden" },
  knob: {
    position: "absolute",
    width: 12,
    height: 12,
    marginLeft: -6,
    borderRadius: 6,
    backgroundColor: C.accent,
  },
  knobBig: { width: 16, height: 16, marginLeft: -8, borderRadius: 8 }, // grows while you drag
  fill: { height: "100%", borderRadius: 2, backgroundColor: C.accent },
  below: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timeText: { fontFamily: F.mono, fontSize: 12, color: C.muted },
  ytLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  ytText: { fontFamily: F.textSemi, fontSize: 12, color: C.muted },
  pressed: { transform: [{ scale: 0.92 }] },
});