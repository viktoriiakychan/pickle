import { useEffect, useRef, useState } from "react";
import { View, Pressable, Animated, Easing, StyleSheet } from "react-native";
import { C } from "./theme";
import CardBack from "./CardBack";
import type { Movie } from "../lib/tmdb";

/**
 * Movie details pop-up (used on Results and Saved).
 * Give it a movie to open it, null to close it. It fades + slides in,
 * and plays the reverse before it disappears.
 */
export default function DetailsSheet({ movie, onClose }: { movie: Movie | null; onClose: () => void }) {
  const [shown, setShown] = useState<Movie | null>(movie); // stays set while the closing animation plays
  const anim = useRef(new Animated.Value(0)).current; // 0 = hidden, 1 = open

  useEffect(() => {
    anim.stopAnimation();
    if (movie) {
      setShown(movie);
      Animated.timing(anim, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: false }).start(
        ({ finished }) => finished && setShown(null)
      );
    }
  }, [movie]);

  if (!shown) return null;

  return (
    <Animated.View style={[s.overlay, { opacity: anim }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View
        style={[
          s.sheet,
          {
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) },
              { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
            ],
          },
        ]}
      >
        <CardBack movie={shown} onFlipBack={onClose} closeIcon />
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(13,17,13,0.82)",
    justifyContent: "center",
    padding: 20,
    zIndex: 50,
  },
  sheet: { height: "82%", borderRadius: 28, overflow: "hidden", backgroundColor: C.surface },
});