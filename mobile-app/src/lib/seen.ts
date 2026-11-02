import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../firebaseConfig";

/** adds a movie to this device's "seen" list (arrayUnion = no duplicates). */
export const markSeen = (myId: string, movieId: string) =>
  setDoc(doc(db, "users", myId), { seen: arrayUnion(movieId) }, { merge: true });

/** everything any player in the room has seen, merged into one set. */
export async function seenByPlayers(ids: string[]): Promise<Set<string>> {
  const docs = await Promise.all(ids.map((id) => getDoc(doc(db, "users", id))));
  return new Set(docs.flatMap((d) => d.data()?.seen ?? []));
}
/** Takes a movie back off this device's "seen" list (for Undo). */
export const unmarkSeen = (myId: string, movieId: string) =>
  updateDoc(doc(db, "users", myId), { seen: arrayRemove(movieId) });

export type Level = "casual" | "regular" | "nerd";
export type Taste = { favs: string[]; level: Level | null; done: boolean };

/** Both players' seen lists (merged) and favourites (merged, no duplicates). */
export async function roomTaste(ids: string[]): Promise<{ seen: Set<string>; favs: string[] }> {
  const docs = await Promise.all(ids.map((id) => getDoc(doc(db, "users", id))));
  const data = docs.map((d) => d.data() ?? {});
  return {
    seen: new Set(data.flatMap((d: any) => d.seen ?? [])),
    favs: [...new Set<string>(data.flatMap((d: any) => d.favs ?? []))],
  };
}

/** Your saved answers, and whether you've finished (or skipped) the survey. */
export async function getTaste(myId: string): Promise<Taste> {
  const d = (await getDoc(doc(db, "users", myId))).data();
  return { favs: d?.favs ?? [], level: d?.level ?? null, done: !!d?.surveyDone };
}

export const saveFavs = (myId: string, favs: string[]) =>
  setDoc(doc(db, "users", myId), { favs }, { merge: true });

export const saveLevel = (myId: string, level: Level) =>
  setDoc(doc(db, "users", myId), { level }, { merge: true });

/** Finished or skipped: don't show the survey automatically again. */
export const markTasteDone = (myId: string) =>
  setDoc(doc(db, "users", myId), { surveyDone: true }, { merge: true });