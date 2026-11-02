import { useEffect, useMemo, useRef, useState } from "react";
import { View, Share, Linking, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useFonts } from "expo-font";
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";

import LandingScreen from "../components/screens/LandingScreen";
import LobbyScreen from "../components/screens/LobbyScreen";
import JoinScreen from "../components/screens/JoinScreen";
import GenreScreen from "../components/screens/GenreScreen";
import SwipeScreen from "../components/screens/SwipeScreen";
import ResultsScreen from "../components/screens/ResultsScreen";
import PickleIcon from "../components/PickleIcon";
import ConfirmDialog from "../components/ComfirmDialog";
import TasteScreen from "../components/screens/TasteScreen";
import { C } from "../components/theme";
import LevelScreen from "../components/screens/LevelScreen";

import { fetchDeck, fetchReplacement, MAX_DECK, whereToWatchUrl, Movie } from "../lib/tmdb";
import { markSeen, seenByPlayers, unmarkSeen, getTaste, saveFavs, saveLevel, Taste, roomTaste, markTasteDone, Level } from "../lib/seen";
import { getMyId, getRoomFromUrl, getSavedRoom, roomLink, saveRoom } from "../lib/identity";
import {
  Room,
  createRoom,
  joinRoom,
  leaveRoom,
  subscribeToRoom,
  playerIds,
  goToGenres,
  chooseGenre,
  startSwiping,
  newRound,
  recordSwipe,
  undoSwipe,
  everyoneFinished,
  sharedMatches,
  addToDeck
} from "../lib/room";

export default function Index() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
    "BricolageDisplay-Bold": require("../../assets/fonts/BricolageDisplay-Bold.ttf"),
    "BricolageDisplay-ExtraBold": require("../../assets/fonts/BricolageDisplay-ExtraBold.ttf"),
  });

  const myId = useMemo(getMyId, []);
  const linkCode = useMemo(getRoomFromUrl, []);

  const [mode, setMode] = useState<"landing" | "join">(linkCode ? "join" : "landing");
  const [code, setCode] = useState<string | null>(() => getSavedRoom());
  const [room, setRoom] = useState<Room | null | undefined>(undefined); // undefined = still loading

  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dealing, setDealing] = useState(false); // host is fetching the deck
  const [myIndex, setMyIndex] = useState(0);
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  const seenThisRound = useRef(new Set<string>()); // movies I tapped "Seen it" on, so Undo can take it back

  const [taste, setTaste] = useState<Taste | undefined>(undefined); // undefined = still loading
  const [tasteStep, setTasteStep] = useState<"favs" | "level" | null>(null); // which survey screen is open

  /* --- live room --------------------------------------- */
  useEffect(() => {
    if (!code) {
      setRoom(undefined);
      return;
    }
    return subscribeToRoom(code, (r) => {
      if (!r || !r.players[myId]) {
        // room gone, or we're not in it any more
        saveRoom(null);
        setCode(null);
        setRoom(undefined);
        return;
      }
      setRoom(r);
    });
  }, [code, myId]);

  /* --- taste profile ------------------------------------ */
  useEffect(() => {
    getTaste(myId)
      .then(setTaste)
      .catch(() => setTaste({ favs: [], level: null, done: true })); // offline: don't block the app
  }, [myId]);

  // new deck → start from wherever Firestore says we are (0 for a fresh round)
  const deckKey = room?.deck?.[0]?.id ?? "";
  useEffect(() => {
    setMyIndex(room?.progress?.[myId] ?? 0);
  }, [deckKey]);

  /* ── actions ─────────────────────────────────────────────────────── */
  const enterRoom = (c: string) => {
    saveRoom(c);
    setCode(c);
    setMode("landing");
  };

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      enterRoom(await createRoom(myId));
    } catch (e) {
      console.warn("createRoom failed", e);
      (globalThis as any).alert?.("Couldn't create a room. Check your connection and try again.");
    }
    setCreating(false);
  };

  const handleFavsDone = (favs: string[]) => {
    setTaste((t) => ({ ...t!, favs }));
    saveFavs(myId, favs).catch(() => {});
    setTasteStep("level");
  };

  const handleLevelDone = (level: Level) => {
    setTaste((t) => ({ ...t!, level, done: true }));
    saveLevel(myId, level).catch(() => {});
    markTasteDone(myId).catch(() => {});
    setTasteStep(null);
  };

  const handleTasteSkip = () => {
    setTaste((t) => ({ ...t!, done: true }));
    markTasteDone(myId).catch(() => {});
    setTasteStep(null);
  };

  const handleJoin = async (c: string) => {
    if (joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      await joinRoom(c, myId);
      enterRoom(c);
    } catch (e: any) {
      setJoinError(e?.message?.length < 80 ? e.message : "Couldn't join. Check your connection and try again.");
    }
    setJoining(false);
  };

  const handleLeave = () => {
    const c = code;
    saveRoom(null);
    setCode(null);
    setRoom(undefined);
    setMode("landing");
    if (c) leaveRoom(c, myId).catch(() => {});
  };

  const confirmLeave = () => {
    const msg = "Leave this room? Your friend will need a new code to play with you again.";
    const ok = typeof window !== "undefined" && window.confirm ? window.confirm(msg) : true;
    if (ok) handleLeave();
  };

  const flashCopied = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    flashCopied();
  };

  const handleShare = async () => {
    if (!code) return;
    const link = roomLink(code);
    const message = link
      ? `Pick a movie with me on Pickle: ${link}`
      : `Pick a movie with me on Pickle! Room code: ${code}`;
    try {
      await Share.share({ message, url: link ?? undefined });
    } catch {
      // browsers without the share sheet: copy the link instead
      await Clipboard.setStringAsync(link ?? code);
      flashCopied();
    }
  };

  const handleStart = async () => {
    if (!code || !room?.genre || dealing) return;
    setDealing(true);
    try {
      const { seen, favs } = await roomTaste(playerIds(room)).catch(() => ({
        seen: new Set<string>(),
        favs: [] as string[],
      }));
      const deck = await fetchDeck(room.genre, seen, favs);

      if (!deck.length) throw new Error("no movies");
      await startSwiping(code, deck);
    } catch (e) {
      console.warn("fetchDeck failed", e);
      (globalThis as any).alert?.("Couldn't load movies. Try again in a sec.");
    }
    setDealing(false);
  };

  const handleSwipe = (liked: boolean) => {
    const movie = room?.deck?.[myIndex];
    if (!code || !movie) return;
    const next = myIndex + 1;
    setMyIndex(next);
    recordSwipe(code, myId, movie.id, liked, next).catch(() => {});
  };

  const handleSeen = async () => {
    const movie = room?.deck?.[myIndex];
    if (!code || !room?.genre || !room.deck || !movie) return;

    markSeen(myId, movie.id).catch(() => {});
    seenThisRound.current.add(movie.id);
    if (room.deck.length >= MAX_DECK) return; // safety limit

    // don't add anything already in the deck, or seen by either of you
    const exclude = await seenByPlayers(playerIds(room)).catch(() => new Set<string>());
    room.deck.forEach((m) => exclude.add(m.id));
    exclude.add(movie.id);

    const extra = await fetchReplacement(room.genre, exclude).catch(() => null);
    if (extra) addToDeck(code, extra).catch(() => {});
  };

  const handleUndo = () => {
    const prev = room?.deck?.[myIndex - 1];
    if (!code || !prev) return;

    if (seenThisRound.current.has(prev.id)) {
      seenThisRound.current.delete(prev.id);
      unmarkSeen(myId, prev.id).catch(() => {});
    }

    const back = myIndex - 1;
    setMyIndex(back);
    undoSwipe(code, myId, prev.id, back).catch(() => {});
  };

  const openWhereToWatch = (m: Movie) => Linking.openURL(whereToWatchUrl(m.id));

  /* ------ screens ------------------------------------------------------- */
  if (!fontsLoaded || (code && room === undefined) || taste === undefined) {
    return (
      <View style={s.splash}>
        <PickleIcon size={56} />
      </View>
    );
  }

  if (code && room) {
    const ids = playerIds(room);
    const isHost = room.hostId === myId;
    const name = (id?: string) => (id && room.players[id]?.name) || "your friend";
    const friendId = ids.find((id) => id !== myId);
    const hostName = name(room.hostId);
    const names = ids.map((id) => room.players[id].name);

    if (room.stage === "lobby") {
      return (
        <LobbyScreen
          code={room.code}
          isHost={isHost}
          copied={copied}
          players={ids.map((id) => ({
            id,
            name: room.players[id].name,
            isHost: id === room.hostId,
            isMe: id === myId,
          }))}
          onBack={handleLeave}
          onCopy={handleCopy}
          onShare={handleShare}
          onContinue={() => goToGenres(room.code)}
        />
      );
    }

    if (room.stage === "genre" || !room.deck) {
      return (
        <GenreScreen
          isHost={isHost}
          hostName={hostName}
          friendName={name(friendId)}
          playerNames={names}
          selected={room.genre}
          loading={dealing}
          onBack={handleLeave}
          onSelect={(g) => chooseGenre(room.code, g)}
          onStart={handleStart}
        />
      );
    }

    if (everyoneFinished(room)) {
      return (
        <ResultsScreen
          genreTitle={room.genre?.title ?? ""}
          names={names}
          matches={sharedMatches(room)}
          onNewGenre={() => newRound(room.code)}
          onWhereToWatch={openWhereToWatch}
          onLeave={handleLeave}
        />
      );
    }

    return (
      <>
        <SwipeScreen
          genreTitle={room.genre?.title ?? ""}
          deck={room.deck}
          index={myIndex}
          friendName={name(friendId)}
          friendIndex={friendId ? room.progress[friendId] ?? 0 : 0}
          onBack={() => setConfirmingLeave(true)}
          onSwipe={handleSwipe}
          onUndo={handleUndo}
          onSeen={handleSeen}
        />
        <ConfirmDialog
          visible={confirmingLeave}
          title="Leave the room?"
          message={`You'll lose your swipes and ${name(friendId)} won't get your matches.`}
          confirmLabel="Leave"
          onCancel={() => setConfirmingLeave(false)}
          onConfirm={() => {
            setConfirmingLeave(false);
            handleLeave();
          }}
        />
      </>
    );
  }

  if (tasteStep !== null || (!taste.done && mode === "landing")) {
    const editing = taste.done; // already finished once = opened from "Your taste"
    if ((tasteStep ?? "favs") === "favs") {
      return (
        <TasteScreen initial={taste.favs} editing={editing} onDone={handleFavsDone} onSkip={handleTasteSkip} />
      );
    }
    return (
      <LevelScreen
        initial={taste.level}
        editing={editing}
        onBack={() => setTasteStep("favs")}
        onDone={handleLevelDone}
        onSkip={handleTasteSkip}
      />
    );
  }

  if (mode === "join") {
    return (
      <JoinScreen
        initialCode={linkCode ?? ""}
        error={joinError}
        joining={joining}
        onBack={() => {
          setJoinError(null);
          setMode("landing");
        }}
        onJoin={handleJoin}
      />
    );
  }

  return (
    <LandingScreen
      creating={creating}
      onCreate={handleCreate}
      onJoin={() => setMode("join")}
      onEditTaste={() => setTasteStep("favs")}
    />
  );
}

const s = StyleSheet.create({
  splash: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
});
