import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  runTransaction,
  arrayUnion,
  arrayRemove,
  deleteField,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import type { Genre, Movie, Query } from "./tmdb";

// Rooms delete themselves 24h after the last round started (Firestore TTL policy on "expireAt").
// Must be a real Timestamp: TTL ignores numbers and strings.
const ROOM_LIFETIME_MS = 24 * 60 * 60 * 1000;
const expiresAt = () => Timestamp.fromMillis(Date.now() + ROOM_LIFETIME_MS);

export const MAX_PLAYERS = 10;

export type Player = { name: string; joinedAt: number; left?: boolean }; // left = went home after swiping, picks still count
export type Stage = "lobby" | "genre" | "swiping";
/** One person's genre choice. genres = up to MAX_GENRES ids, any = "Surprise me", no = "Not tonight". */
export type Mood = { genres: string[]; any: boolean; no: string | null; ready: boolean };
export const MAX_GENRES = 2;
export const EMPTY_MOOD: Mood = { genres: [], any: false, no: null, ready: false };

/** "Pick for us" result: which movie won, which spin it was (1 or 2), and when (so phones can sync the animation). */
export type Tonight = { movieId: string; spin: number; at: number };

export type Room = {
  code: string;
  hostId: string;
  players: Record<string, Player>;
  stage: Stage;
  genre: Genre | null;
  plan?: Query | null;
  moods?: Record<string, Mood>;
  tonight?: Tonight | null;
  deck: Movie[] | null;
  progress: Record<string, number>;
  picks: Record<string, string[]>;
  solo?: boolean;
};

// Players get a pickle nickname so the screens can say "Dill" and "Gherkin"
// without a sign-up step. Swap this for a name input whenever you like.
const NAMES = [
  "Dill", "Gherkin", "Cornichon", "Brine", "Relish", "Spear",
  "Crunch", "Kosher", "Zest", "Snap", "Tang", "Sour",
];
const CODE_WORDS = ["DILL", "BRIN", "SOUR", "CUKE", "ZEST", "SNAP", "TANG", "JARS", "PICK", "CRNC"];

const roomRef = (code: string) => doc(db, "rooms", code);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const makeCode = () => pick(CODE_WORDS) + String(Math.floor(Math.random() * 90) + 10);

/** Ordered player ids: host first, then by join time. */
export function playerIds(room: Room): string[] {
  return Object.keys(room.players).sort((a, b) => {
    if (a === room.hostId) return -1;
    if (b === room.hostId) return 1;
    return room.players[a].joinedAt - room.players[b].joinedAt;
  });
}

export async function createRoom(myId: string, solo = false): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    const ref = roomRef(code);
    const existing = await getDoc(ref);
    const createdAt = existing.data()?.createdAt?.toMillis?.() ?? 0;
    const isFresh = Date.now() - createdAt < 24 * 60 * 60 * 1000; // under a day old = still in use
    if (existing.exists() && isFresh) continue;

    await setDoc(ref, {
      code,
      hostId: myId,
      createdAt: serverTimestamp(),
      expireAt: expiresAt(), // auto-deleted 24h later (Firestore TTL policy)
      players: { [myId]: { name: pick(NAMES), joinedAt: Date.now() } },
      stage: solo ? "genre" : "lobby", // solo goes straight to picking a genre
      solo: solo,                      // true = one-person game, nobody can join
      genre: null,
      deck: null,
      progress: {},
      picks: {},
    });
    return code;
  }
  throw new Error("Couldn't make a room code, try again");
}

/** Throws an Error with a friendly message if the room can't be joined. */
export async function joinRoom(code: string, myId: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("No room with that code. Check it and try again.");
    const room = snap.data() as Room;
    if (room.solo) throw new Error("That's someone's solo game, it can't be joined.");
    if (room.players[myId]) return; // already in (e.g. rejoining after a refresh)
    const ids = Object.keys(room.players);
    if (ids.length >= MAX_PLAYERS) throw new Error("That room is full.");
    const taken = new Set(ids.map((id) => room.players[id].name));
    const name = pick(NAMES.filter((n) => !taken.has(n)));
    tx.update(ref, { [`players.${myId}`]: { name, joinedAt: Date.now() } });
  });
}

export async function leaveRoom(code: string, myId: string): Promise<void> {
  const ref = roomRef(code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as Room;
    const others = Object.keys(room.players).filter((id) => id !== myId && !room.players[id].left);
    const finished =
      room.stage === "swiping" && !!room.deck && (room.progress?.[myId] ?? 0) >= room.deck.length;

    const update: Record<string, any> = finished
      ? { [`players.${myId}.left`]: true }
      : {
          [`players.${myId}`]: deleteField(),
          [`progress.${myId}`]: deleteField(),
          [`picks.${myId}`]: deleteField(),
          [`moods.${myId}`]: deleteField(),
        };
    if (room.hostId === myId && others.length) update.hostId = others[0]; // hand over host
    tx.update(ref, update);
  });
}

export function subscribeToRoom(code: string, onChange: (room: Room | null) => void) {
  return onSnapshot(
    roomRef(code),
    (snap) => onChange(snap.exists() ? (snap.data() as Room) : null),
    () => onChange(null)
  );
}

/* ── host actions ──────────────────────────────────────────────────── */
export const goToGenres = (code: string) => updateDoc(roomRef(code), { stage: "genre" });

/** Anyone: save my genre picks. Everyone else sees them straight away. */
export const setMood = (code: string, myId: string, mood: Mood) =>
  updateDoc(roomRef(code), { [`moods.${myId}`]: mood });

/** Host: deck is built, everyone goes to swiping. `label` is the deck's name, e.g. "Comedy + Romance". */
export const startSwiping = (code: string, deck: Movie[], label: string, plan: Query) =>
  updateDoc(roomRef(code), {
    stage: "swiping",
    deck,
    genre: { id: plan.with || "any", title: label },
    plan,
    progress: {},
    picks: {},
    tonight: null,
    expireAt: expiresAt(), // a new round pushes the deletion back another 24h
  });

/** Anyone: "Pick for us". Every phone in the room plays the spin and lands on this movie. */
export const pickTonight = (code: string, movieId: string, spin: number) =>
  updateDoc(roomRef(code), { tonight: { movieId, spin, at: Date.now() } });

export function newRound(code: string, ids: string[], gone: string[] = []) {
  const update: Record<string, any> = { stage: "genre", genre: null, plan: null, deck: null, progress: {}, picks: {}, tonight: null };
  ids.forEach((id) => (update[`moods.${id}.ready`] = false));
  // people who left after the last round aren't part of the new one
  gone.forEach((id) => {
    update[`players.${id}`] = deleteField();
    update[`moods.${id}`] = deleteField();
  });
  return updateDoc(roomRef(code), update);
}

/* ── swiping ───────────────────────────────────────────────────────── */
export function recordSwipe(code: string, myId: string, movieId: string, liked: boolean, newIndex: number) {
  const update: Record<string, any> = { [`progress.${myId}`]: newIndex };
  if (liked) update[`picks.${myId}`] = arrayUnion(movieId);
  return updateDoc(roomRef(code), update);
}

export function undoSwipe(code: string, myId: string, movieId: string, newIndex: number) {
  return updateDoc(roomRef(code), {
    [`progress.${myId}`]: newIndex,
    [`picks.${myId}`]: arrayRemove(movieId),
  });
}


/* ── derived state ─────────────────────────────────────────────────── */
export function everyoneFinished(room: Room): boolean {
  if (!room.deck?.length) return false;
  const ids = playerIds(room);
  return ids.length > 0 && ids.every((id) => (room.progress[id] ?? 0) >= room.deck!.length);
}

export const addToDeck = (code: string, movie: Movie) =>
  updateDoc(roomRef(code), { deck: arrayUnion(movie) });

export type Match = { movie: Movie; yes: number; of: number };

/** Movies more than half the room said yes to (2 people = both, solo = your picks). Most yeses first, then rating. */
export function groupMatches(room: Room): Match[] {
  const ids = playerIds(room);
  const need = Math.min(ids.length, Math.max(2, Math.floor(ids.length / 2) + 1));
  return (room.deck ?? [])
    .map((movie) => ({
      movie,
      yes: ids.filter((id) => room.picks[id]?.includes(movie.id)).length,
      of: ids.length,
    }))
    .filter((m) => m.yes >= need)
    .sort((a, b) => b.yes - a.yes || Number(b.movie.rating || 0) - Number(a.movie.rating || 0));
}