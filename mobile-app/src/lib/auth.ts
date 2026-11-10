import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

const OLD_ID_KEY = "pickle.uid"; // before sign-in, each browser made up its own random id

/** Testers who used Pickle before this had their taste saved under the old id: copy it over once. */
async function moveOldProfile(uid: string) {
  try {
    if (typeof localStorage === "undefined") return;
    const old = localStorage.getItem(OLD_ID_KEY);
    if (old && old !== uid) {
      const snap = await getDoc(doc(db, "users", old));
      if (snap.exists()) await setDoc(doc(db, "users", uid), snap.data(), { merge: true });
    }
    localStorage.setItem(OLD_ID_KEY, uid); // done, never again
  } catch {
    // worst case they redo the 2 taste questions
  }
}

/** My user id once signed in (null while signing in). failed = couldn't sign in, e.g. offline. */
export function useUserId() {
  const [uid, setUid] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          await moveOldProfile(user.uid);
          setUid(user.uid);
        } else {
          signInAnonymously(auth).catch(() => setFailed(true)); // first visit
        }
      }),
    []
  );

  return { uid, failed };
}