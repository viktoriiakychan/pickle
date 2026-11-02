import { useEffect, useRef } from "react";
import { View, Animated, Easing, Platform, StyleSheet } from "react-native";
import { C } from "./theme";

/*
  Animated version of the logo: the two pickles start apart and upright,
  then swing in to the logo pose (±18°) with a little overshoot, hold, and part again.
  Same geometry as PickleIcon (38×38 viewBox), scaled to `size`.
*/
export default function PickleLoader({ size = 56, background = C.bg }: { size?: number; background?: string }) {
  const k = size / 38; // scale from the logo's 38-unit grid
  const t = useRef(new Animated.Value(0)).current; // 0 = apart, 1 = together
  const useNativeDriver = Platform.OS !== "web";

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        // swing in, Easing.back overshoots a bit so they "clink"
        Animated.timing(t, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(2.2)), useNativeDriver }),
        Animated.delay(420),
        Animated.timing(t, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.cubic), useNativeDriver }),
        Animated.delay(160),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const greenRotate = t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "18deg"] });
  const creamRotate = t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-18deg"] });
  const greenX = t.interpolate({ inputRange: [0, 1], outputRange: [-5 * k, 0] });
  const creamX = t.interpolate({ inputRange: [0, 1], outputRange: [5 * k, 0] });

  const pickle = { top: 4 * k, width: 13 * k, height: 30 * k, borderRadius: 6.5 * k };
  const cut = 1.5 * k; // the dark outline on the cream pickle, like the logo

  return (
    <View style={{ width: size, height: size }}>
      {/* green pickle (you) */}
      <Animated.View
        style={[
          s.abs,
          pickle,
          { left: 7 * k, backgroundColor: C.accent, transform: [{ translateX: greenX }, { rotate: greenRotate }] },
        ]}
      />
      {/* cream pickle (friend), drawn on top with a dark outline so it "cuts" into the green one */}
      <Animated.View
        style={[
          s.abs,
          {
            top: pickle.top - cut,
            left: 18 * k - cut,
            width: pickle.width + cut * 2,
            height: pickle.height + cut * 2,
            borderRadius: pickle.borderRadius + cut,
            borderWidth: cut,
            borderColor: background,
            backgroundColor: C.cream,
            transform: [{ translateX: creamX }, { rotate: creamRotate }],
          },
        ]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  abs: { position: "absolute" },
});