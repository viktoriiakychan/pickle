import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";

const TITLE = "Pickle · Pick a flick";

export default function RootLayout() {
  // web only: browser tab title + dark phone browser bar
  useEffect(() => {
    if (Platform.OS !== "web") return;
    document.title = TITLE;

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "#0D110D");
  }, []);

  return (
    <Stack
      screenOptions={{
        title: TITLE, // the router also uses this for the tab title, so it doesn't get overwritten
        headerShown: false,
        contentStyle: { backgroundColor: "#0D110D" },
      }}
    />
  );
}