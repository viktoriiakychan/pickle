// Who "you" are on this device: a random id plus the room you're in,
// kept in localStorage on the web so a page refresh drops you back in.
// (On native this falls back to memory, which is fine for Expo Go testing.)

const memory: Record<string, string> = {};

function read(key: string): string | null {
  try {
    if (typeof localStorage !== "undefined") return localStorage.getItem(key);
  } catch {}
  return memory[key] ?? null;
}

function write(key: string, value: string | null) {
  try {
    if (typeof localStorage !== "undefined") {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      return;
    }
  } catch {}
  if (value === null) delete memory[key];
  else memory[key] = value;
}

const randomId = () =>
  Array.from({ length: 20 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");

export function getMyId(): string {
  let id = read("pickle.uid");
  if (!id) {
    id = randomId();
    write("pickle.uid", id);
  }
  return id;
}

export const getSavedRoom = () => read("pickle.room");
export const saveRoom = (code: string | null) => write("pickle.room", code);

/** ?room=DILL42 in the URL (from a shared link), web only */
export function getRoomFromUrl(): string | null {
  try {
    if (typeof window === "undefined" || !window.location?.search) return null;
    const code = new URLSearchParams(window.location.search).get("room");
    return code ? code.toUpperCase().slice(0, 6) : null;
  } catch {
    return null;
  }
}

/** Link a friend can open to join, web only */
export function roomLink(code: string): string | null {
  try {
    if (typeof window === "undefined" || !window.location?.origin) return null;
    return `${window.location.origin}/?room=${code}`;
  } catch {
    return null;
  }
}
