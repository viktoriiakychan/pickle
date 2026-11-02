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