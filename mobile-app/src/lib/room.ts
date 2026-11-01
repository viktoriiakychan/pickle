// Shared rooms in Cloud Firestore: one document per room at rooms/{CODE}.
//
// rooms/DILL42 = {
//   code, hostId, createdAt,
//   players:  { [playerId]: { name, joinedAt } },
//   stage:    "lobby" | "genre" | "swiping",
//   genre:    { id, title } | null     ← host taps a chip, guest sees it live
//   deck:     Movie[] | null           ← the same 20 movies for both phones
//   progress: { [playerId]: number }   ← how many cards each person has swiped
//   picks:    { [playerId]: string[] } ← movie ids each person said yes to
// }
//
// Results aren't stored: once everyone's progress reaches the end of the
// deck, the app shows the movies that are in everyone's picks.

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
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import type { Genre, Movie } from "./tmdb";

export const MAX_PLAYERS = 2;

export type Player = { name: string; joinedAt: number };
export type Stage = "lobby" | "genre" | "swiping";
export type Room = {
  code: string;
  hostId: string;
  players: Record<string, Player>;
  stage: Stage;
  genre: Genre | null;
  deck: Movie[] | null;
  progress: Record<string, number>;
  picks: Record<string, string[]>;
};

// Players get a pickle nickname so the screens can say "Dill" and "Gherkin"
// without a sign-up step. Swap this for a name input whenever you like.
const NAMES = ["Dill", "Gherkin", "Cornichon", "Brine", "Relish", "Spear", "Crunch", "Kosher"];
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

export async function createRoom(myId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    const ref = roomRef(code);
    const existing = await getDoc(ref);
    if (existing.exists()) continue;
    await setDoc(ref, {
      code,
      hostId: myId,
      createdAt: serverTimestamp(),
      players: { [myId]: { name: pick(NAMES), joinedAt: Date.now() } },
      stage: "lobby",
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
    const others = Object.keys(room.players).filter((id) => id !== myId);
    const update: Record<string, any> = {
      [`players.${myId}`]: deleteField(),
      [`progress.${myId}`]: deleteField(),
      [`picks.${myId}`]: deleteField(),
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

export const chooseGenre = (code: string, genre: Genre) => updateDoc(roomRef(code), { genre });

export const startSwiping = (code: string, deck: Movie[]) =>
  updateDoc(roomRef(code), { stage: "swiping", deck, progress: {}, picks: {} });

/** "New genre" on the results screen: back to the picker, scores wiped. */
export const newRound = (code: string) =>
  updateDoc(roomRef(code), { stage: "genre", genre: null, deck: null, progress: {}, picks: {} });

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

/** Movies everyone picked, best rated first. */
export function sharedMatches(room: Room): Movie[] {
  const ids = playerIds(room);
  return (room.deck ?? [])
    .filter((m) => ids.every((id) => room.picks[id]?.includes(m.id)))
    .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
}
