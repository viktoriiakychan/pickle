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
import ConfirmDialog from "../components/ConfirmDialog";
import TasteScreen from "../components/screens/TasteScreen";
import { C } from "../components/theme";
import LevelScreen from "../components/screens/LevelScreen";
import PickleLoader from "../components/PickleLoader";

import { buildDeck, fetchReplacement, MAX_DECK, whereToWatchUrl, Movie, GENRES } from "../lib/tmdb";
import { markSeen, unmarkSeen, 
    getTaste, saveFavs, saveLevel, Taste, roomTaste,
    markTasteDone, Level, markLiked, unmarkLiked } from "../lib/seen";
import { getMyId, getRoomFromUrl, getSavedRoom, roomLink, saveRoom } from "../lib/identity";
import {
  Room,
  createRoom,
  joinRoom,
  leaveRoom,
  subscribeToRoom,
  playerIds,
  goToGenres,
  setMood,
  startSwiping,
  newRound,
  recordSwipe,
  undoSwipe,
  everyoneFinished,
  addToDeck,
  groupMatches,
  EMPTY_MOOD,
} from "../lib/room";

import SavedScreen from "../components/screens/SavedScreen";
import { nightId, saveNight } from "../lib/savedMatches";

const NO_TASTE = () => ({ seen: new Set<string>(), favs: [] as string[], level: "casual" as Level });

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

  const [mode, setMode] = useState<"landing" | "join" | "saved">(linkCode ? "join" : "landing");
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
      saveRoom(code);
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

   const finished = !!room && room.stage === "swiping" && everyoneFinished(room);
  const thisNight = finished && room?.deck ? nightId(room.code, room.deck) : null;
  useEffect(() => {
    if (!thisNight || !room) return;
    const matches = groupMatches(room).map((m) => m.movie);
    if (!matches.length) return; // no matches, nothing to save
    saveNight({
      id: thisNight,
      at: Date.now(),
      genre: room.genre?.title ?? "",
      with: playerIds(room).filter((id) => id !== myId).map((id) => room.players[id].name),
      solo: !!room.solo,
      movies: matches,
    });
  }, [thisNight]);

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

  const handleSolo = async () => {
    if (creating) return;
    setCreating(true);
    try {
      enterRoom(await createRoom(myId, true));
    } catch (e) {
      console.warn("createRoom (solo) failed", e);
      (globalThis as any).alert?.("Couldn't start. Check your connection and try again.");
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

  // everyone's genre picks, with missing fields filled in
  const moodOf = (r: Room, id: string) => ({ ...EMPTY_MOOD, ...r.moods?.[id] });

  const handleStart = async () => {
    if (!code || !room || dealing) return;
    setDealing(true);
    try {
      const ids = playerIds(room);
      const moods = ids.map((id) => ({ id, genres: moodOf(room, id).genres, no: moodOf(room, id).no }));
      const { seen, favs, level } = await roomTaste(ids).catch(NO_TASTE);
      const { deck, plan, label } = await buildDeck(moods, seen, favs, level);

      if (!deck.length) throw new Error("no movies");
      await startSwiping(code, deck, label, plan);
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
    if (liked) markLiked(myId, movie.id).catch(() => {});
  };

  const handleSeen = async () => {
    const movie = room?.deck?.[myIndex];
    if (!code || !room?.genre || !room.deck || !movie) return;

    markSeen(myId, movie.id).catch(() => {});
    seenThisRound.current.add(movie.id);
    if (room.deck.length >= MAX_DECK) return; // safety limit

    // don't add anything already in the deck, or seen by either of you
    const { seen: exclude, level } = await roomTaste(playerIds(room)).catch(NO_TASTE);
    room.deck.forEach((m) => exclude.add(m.id));
    exclude.add(movie.id);

    const plan = room.plan ?? { with: room.genre.id, without: "" }; // older rooms had one genre
    const extra = await fetchReplacement(plan, exclude, level).catch(() => null);
    if (extra) addToDeck(code, extra).catch(() => {});
  };

  const handleUndo = () => {
    const prev = room?.deck?.[myIndex - 1];
    if (!code || !prev) return;

    if (room?.picks?.[myId]?.includes(prev.id)) unmarkLiked(myId, prev.id).catch(() => {});

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
        <PickleLoader size={56} />
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
    const others = ids
      .filter((id) => id !== myId)
      .map((id) => ({ name: room.players[id].name, index: room.progress[id] ?? 0 }));
    
    const group = others.length > 1;
    const solo = !!room.solo;

    // little label on each swipe card: "You both picked Comedy", "Brine's pick", "Romance + Horror blend"
    const genreTitles = (gs: string[]) => gs.map((g) => GENRES.find((x) => x.id === g)?.title ?? "").join(" + ");
    const tagLabel = (m: Movie): string | null => {
      const t = m.tag;
      if (!t) return null;
      if (t.kind === "blend") return `${genreTitles(t.genres)} blend`;
      if (t.kind === "everyone") return `${ids.length === 2 ? "You both" : "Everyone"} picked ${genreTitles(t.genres)}`;
      if (t.kind === "pick" && solo) return genreTitles(t.genres) || null; // "Romance"
      if (t.kind === "pick" && t.by) return t.by === myId ? "Your pick" : `${name(t.by)}'s pick`;
      return null;
    };

    // tap the pill on the swipe screen: who picked what
    const genreDetails = ids.flatMap((id) => {
      const md = moodOf(room, id);
      const who = solo ? "You picked" : id === myId ? "You" : name(id);
      const lines: { who: string; what: string; no?: boolean }[] = [];
      if (md.genres.length) lines.push({ who, what: genreTitles(md.genres) });
      else if (md.any) lines.push({ who, what: "Surprise me" });
      if (md.no) lines.push({ who: "Not tonight", what: solo ? genreTitles([md.no]) : `${genreTitles([md.no])} (${who})`, no: true });
      return lines;
    });

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
          players={ids.map((id) => ({
            id,
            name: room.players[id].name,
            isMe: id === myId,
            isHost: id === room.hostId,
            mood: moodOf(room, id),
          }))}
          loading={dealing}
          solo={solo}
          onBack={handleLeave}
          onChange={(mood) => setMood(room.code, myId, mood).catch(() => {})}
          onStart={handleStart}
        />
      );
    }

    if (everyoneFinished(room)) {
      const matches = groupMatches(room);
      return (
        <ResultsScreen
          genreTitle={room.genre?.title ?? ""}
          names={names}
          matches={matches.map((m) => m.movie)}
          votes={Object.fromEntries(matches.map((m) => [m.movie.id, m.yes]))}
          groupSize={ids.length}
          onNewGenre={() =>
            newRound(
              room.code,
              ids.filter((id) => !room.players[id].left),
              ids.filter((id) => room.players[id].left)
            )
          }
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
          others={others}
          onBack={() => setConfirmingLeave(true)}
          onSwipe={handleSwipe}
          myName={name(myId)}
          onUndo={handleUndo}
          onSeen={handleSeen}
          tagFor={(m) => tagLabel(m)}
          genreDetails={genreDetails}
        />
        <ConfirmDialog
          visible={confirmingLeave}
          title="Leave the room?"
          message={
            solo
              ? "You'll lose your swipes so far."
              : `You'll lose your swipes and ${group ? "the group" : name(friendId)} won't get your matches.`
          }
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

  if (mode === "saved") {
    return (
      <SavedScreen
        onBack={() => setMode("landing")}
        onOpen={(m) => Linking.openURL(whereToWatchUrl(m.id))}
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
      onSolo={handleSolo}
      onSaved={() => setMode("saved")}
      onEditTaste={() => setTasteStep("favs")}
    />
  );
}

const s = StyleSheet.create({
  splash: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
});
