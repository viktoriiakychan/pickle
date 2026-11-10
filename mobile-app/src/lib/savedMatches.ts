import type { Movie } from "./tmdb";

// What we keep per movie. overview/backdrop/runtime were added later, so older saves won't have them.
export type SavedMovie = Pick<Movie, "id" | "title" | "year" | "rating" | "poster"> &
  Partial<Pick<Movie, "overview" | "backdrop" | "runtime">>;

export type Night = {
  id: string;
  at: number;           // when
  genre: string;        // the deck's name, e.g. "Crime + 3 more"
  genres?: string[];    // every genre that went into it (newer saves only)
  with: string[];       // other people's names (empty if solo)
  solo: boolean;
  movies: SavedMovie[]; // best match first
};

const KEY = "pickle.saved";
const WATCHED_KEY = "pickle.watched";
const KEEP = 50; // oldest nights get dropped after 50

const memory: Record<string, string> = {}; // fallback on native (no localStorage there yet)

function read<T>(key: string, fallback: T): T {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(key) : memory[key];
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, raw);
      return;
    }
  } catch {}
  memory[key] = raw;
}

const load = () => read<Night[]>(KEY, []);
const store = (nights: Night[]) => write(KEY, nights);

/** Same room + same deck = same night, so saving twice doesn't duplicate it. */
export const nightId = (code: string, deck: Movie[]) => `${code}-${deck[0]?.id ?? "x"}`;

export function saveNight(night: Omit<Night, "movies"> & { movies: Movie[] }) {
  const entry: Night = {
    ...night,
    movies: night.movies.map(({ id, title, year, rating, poster, overview, backdrop, runtime }) => ({
      id, title, year, rating, poster, overview, backdrop, runtime,
    })),
  };
  const all = load();
  const old = all.find((n) => n.id === entry.id);
  if (old && old.movies.length > entry.movies.length) return; // never shrink a night that's already saved
  const others = all.filter((n) => n.id !== entry.id);
  store([entry, ...others].slice(0, KEEP)); // newest first, max 50
}

export const getNights = (): Night[] => load();

export const deleteNight = (id: string) => store(load().filter((n) => n.id !== id));

/** Undo a delete: put the night back in its place (nights are kept newest first). */
export const restoreNight = (night: Night) =>
  store([...load().filter((n) => n.id !== night.id), night].sort((a, b) => b.at - a.at).slice(0, KEEP));

/* ── watched ───────────────────────────────────────────────────────────
   One list for the whole app: if you've watched a movie, it's watched in every night it shows up in. */
export const getWatched = () => new Set(read<string[]>(WATCHED_KEY, []));

export function setWatched(id: string, on: boolean) {
  const all = getWatched();
  if (on) all.add(id);
  else all.delete(id);
  write(WATCHED_KEY, [...all]);
}