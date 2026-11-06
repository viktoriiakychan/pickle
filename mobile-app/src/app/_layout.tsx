import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";

const TITLE = "Pickle";

// paint the page itself dark, so Safari's top and bottom bars match the app
const BG = "#0D110D";
document.documentElement.style.backgroundColor = BG;
document.body.style.backgroundColor = BG;

// tell the browser this is a dark site (dark scrollbars, form controls, etc.)
let scheme = document.querySelector('meta[name="color-scheme"]');
if (!scheme) {
  scheme = document.createElement("meta");
  scheme.setAttribute("name", "color-scheme");
  document.head.appendChild(scheme);
}
scheme.setAttribute("content", "dark");

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