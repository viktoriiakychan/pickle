import type { Movie } from "./tmdb";

export type SavedMovie = Pick<Movie, "id" | "title" | "year" | "rating" | "poster">;
export type Night = {
  id: string;
  at: number;           // when
  genre: string;
  with: string[];       // other people's names (empty if solo)
  solo: boolean;
  movies: SavedMovie[]; // best match first
};

const KEY = "pickle.saved";
const KEEP = 50; // oldest nights get dropped after 50

let memory: Night[] = []; // fallback on native (no localStorage there yet)

function load(): Night[] {
  try {
    if (typeof localStorage !== "undefined") return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {}
  return memory;
}

function store(nights: Night[]) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(KEY, JSON.stringify(nights));
      return;
    }
  } catch {}
  memory = nights;
}

/** Same room + same deck = same night, so saving twice doesn't duplicate it. */
export const nightId = (code: string, deck: Movie[]) => `${code}-${deck[0]?.id ?? "x"}`;

export function saveNight(night: Omit<Night, "movies"> & { movies: Movie[] }) {
  const entry: Night = {
    ...night,
    movies: night.movies.map(({ id, title, year, rating, poster }) => ({ id, title, year, rating, poster })),
  };
  const all = load();
  const old = all.find((n) => n.id === entry.id);
  if (old && old.movies.length > entry.movies.length) return; // never shrink a night that's already saved
  const others = all.filter((n) => n.id !== entry.id);
  store([entry, ...others].slice(0, KEEP)); // newest first, max 50
}

export const getNights = (): Night[] => load();

export const deleteNight = (id: string) => store(load().filter((n) => n.id !== id));