import type { Level } from "./seen";

const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3";

export const DECK_SIZE = 20;
export const MAX_DECK = 30; // deck can grow to this with "Seen it" replacements
const FOR_YOU = 14; // max "recommended for you" cards per deck, the rest are popular

export type Genre = { id: string; title: string };

// The 12 genres from the design, with TMDB's genre ids.
export const GENRES: Genre[] = [
  { id: "28", title: "Action" },
  { id: "12", title: "Adventure" },
  { id: "16", title: "Animation" },
  { id: "35", title: "Comedy" },
  { id: "80", title: "Crime" },
  { id: "99", title: "Documentary" },
  { id: "18", title: "Drama" },
  { id: "10751", title: "Family" },
  { id: "27", title: "Horror" },
  { id: "10749", title: "Romance" },
  { id: "878", title: "Sci-Fi" },
  { id: "53", title: "Thriller" },
];

export type Movie = {
  id: string;
  title: string;
  year: string;
  rating: string;   // "7.6"
  runtime: string;  // "1h 52m" (empty if TMDB doesn't know)
  overview: string;
  poster: string | null;
  backdrop: string | null;
  tagline: string;
};

export type MovieDetails = {
  cast: { name: string; character: string; photo: string | null }[];
  trailerKey: string | null;
  tagline: string;
  genres: string[];
  providers: { name: string; logo: string | null }[];
};

const img = (path: string | null | undefined, size: string) =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

const formatRuntime = (mins?: number) => {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** How each "picky" level changes what we ask TMDB for. */
const LEVELS: Record<
  Level,
  { sort: string; minVotes: number; minRating: number; pages: [number, number]; englishOnly: boolean }
> = {
  casual: { sort: "popularity.desc", minVotes: 1000, minRating: 0, pages: [1, 5], englishOnly: true },
  regular: { sort: "popularity.desc", minVotes: 300, minRating: 6.8, pages: [3, 15], englishOnly: false },
  nerd: { sort: "vote_average.desc", minVotes: 150, minRating: 7.3, pages: [1, 15], englishOnly: false },
};

const discoverUrl = (genre: Genre, level: Level, page: number) => {
  const c = LEVELS[level];
  return (
    `${BASE}/discover/movie?api_key=${API_KEY}&with_genres=${genre.id}&include_adult=false` +
    `&sort_by=${c.sort}&vote_count.gte=${c.minVotes}&vote_average.gte=${c.minRating}` +
    (c.englishOnly ? "&with_original_language=en" : "") +
    `&page=${page}`
  );
};

/** ~60 movies for this genre + level, from random pages that actually exist. */
async function fetchPool(genre: Genre, level: Level): Promise<any[]> {
  const [lo, hi] = LEVELS[level].pages;

  // page 1 tells us how many pages exist for this genre + level
  const first = await fetch(discoverUrl(genre, level, 1)).then((r) => r.json());
  const total = Math.min(first.total_pages ?? 1, 500); // TMDB never goes past page 500
  const from = lo <= total ? lo : 1;
  const to = Math.max(from, Math.min(hi, total));
  const pages = [1, 2, 3].map(() => from + Math.floor(Math.random() * (to - from + 1)));

  const responses = await Promise.all(pages.map((p) => fetch(discoverUrl(genre, level, p)).then((r) => r.json())));
  let all = responses.flatMap((d: any) => d.results ?? []);
  if (all.length < DECK_SIZE) all = [...all, ...(first.results ?? [])]; // small genre: use page 1 too

  return [...new Map(all.map((m: any) => [m.id, m])).values()];
}

/** Turns raw TMDB results into our Movie type (runtime needs one extra request each). */
async function toMovies(results: any[]): Promise<Movie[]> {
  // one details request per movie: gives runtime + tagline
  const extras = await Promise.all(
    results.map((m) =>
      fetch(`${BASE}/movie/${m.id}?api_key=${API_KEY}`)
        .then((r) => r.json())
        .then((d) => ({ runtime: formatRuntime(d.runtime), tagline: d.tagline ?? "" }))
        .catch(() => ({ runtime: "", tagline: "" }))
    )
  );
  return results.map((m, i) => ({
    id: String(m.id),
    title: m.title,
    year: m.release_date ? m.release_date.slice(0, 4) : "",
    rating: typeof m.vote_average === "number" ? m.vote_average.toFixed(1) : "",
    runtime: extras[i].runtime,
    tagline: extras[i].tagline,
    overview: m.overview ?? "",
    poster: img(m.poster_path, "w500"),
    backdrop: img(m.backdrop_path, "w780"),
  }));
}

/** "If you liked X" for each favourite, only in this genre, best matches first. */
async function recommendedFor(favs: string[], genre: Genre, level: Level): Promise<any[]> {
  const c = LEVELS[level];
  const lists = await Promise.all(
    favs.map((id) =>
      fetch(`${BASE}/movie/${id}/recommendations?api_key=${API_KEY}`)
        .then((r) => r.json())
        .then((d) => d.results ?? [])
        .catch(() => [])
    )
  );

  // score = how many favourites recommend this movie
  const scores = new Map<number, { movie: any; score: number }>();
  for (const list of lists) {
    for (const m of list) {
      if (!m.genre_ids?.includes(Number(genre.id))) continue; // only the room's genre
      if ((m.vote_count ?? 0) < c.minVotes) continue;                   // too obscure for this level
      if ((m.vote_average ?? 0) < c.minRating) continue;                // not rated well enough
      if (c.englishOnly && m.original_language !== "en") continue;      // casual = English only
      const entry = scores.get(m.id) ?? { movie: m, score: 0 };
      entry.score += 1;
      scores.set(m.id, entry);
    }
  }

  // shuffle first so equal scores come out in a random order, then best score first
  return shuffle([...scores.values()])
    .sort((a, b) => b.score - a.score)
    .map((e) => e.movie);
}

/** Builds the shared deck: up to 14 "for you" + movies for this level, minus anything seen. */
export async function fetchDeck(
  genre: Genre,
  seen: Set<string> = new Set(),
  favs: string[] = [],
  level: Level = "casual"
): Promise<Movie[]> {
  const notSeen = (m: any) => !seen.has(String(m.id));

  const [recs, pool] = await Promise.all([
    favs.length ? recommendedFor(favs, genre, level) : Promise.resolve([]),
    fetchPool(genre, level),
  ]);

  const forYou = recs.filter(notSeen).slice(0, FOR_YOU);
  const forYouIds = new Set(forYou.map((m: any) => m.id));
  const rest = pool.filter((m: any) => notSeen(m) && !forYouIds.has(m.id));

  const picked = [...forYou, ...shuffle(rest)].slice(0, DECK_SIZE);

  return toMovies(shuffle(picked));
}

/** One extra movie for "Seen it", at the room's level, skipping anything in `exclude`. */
export async function fetchReplacement(
  genre: Genre,
  exclude: Set<string>,
  level: Level = "casual"
): Promise<Movie | null> {
  const options = (await fetchPool(genre, level)).filter((m: any) => !exclude.has(String(m.id)));
  if (!options.length) return null;
  const [movie] = await toMovies(shuffle(options).slice(0, 1));
  return movie;
}

export async function fetchDetails(movieId: string): Promise<MovieDetails> {
  try {
    const res = await fetch(
      `${BASE}/movie/${movieId}?api_key=${API_KEY}&append_to_response=credits,videos,watch/providers`
    );
    const d = await res.json();
    const trailer = (d.videos?.results ?? []).find(
      (v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
    );
    return {
      cast: (d.credits?.cast ?? []).slice(0, 8).map((c: any) => ({
        name: c.name, character: c.character, photo: img(c.profile_path, "w185"),
      })),
      trailerKey: trailer?.key ?? null,
      tagline: d.tagline ?? "",
      genres: (d.genres ?? []).map((g: any) => g.name),
      providers: (d["watch/providers"]?.results?.IE?.flatrate ?? []).slice(0, 5).map((p: any) => ({
        name: p.provider_name, logo: img(p.logo_path, "w92"),
      })),
    };
  } catch {
    return { cast: [], trailerKey: null, tagline: "", genres: [], providers: [] };
  }
}

export const whereToWatchUrl = (movieId: string) =>
  `https://www.themoviedb.org/movie/${movieId}/watch?locale=IE`;

/** "2026 · ★ 7.6 · 1h 52m", skipping anything missing */
export const metaLine = (m: Pick<Movie, "year" | "rating" | "runtime">, withRuntime = true) =>
  [m.year, m.rating && `★ ${m.rating}`, withRuntime && m.runtime].filter(Boolean).join(" · ");


const SEARCH_URLS: Record<string, (q: string) => string> = {
  "Netflix": (q) => `https://www.netflix.com/search?q=${q}`,
  "Amazon Prime Video": (q) => `https://www.primevideo.com/search?phrase=${q}`,
  "Apple TV Plus": (q) => `https://tv.apple.com/search?term=${q}`,
};

export const providerUrl = (provider: string, title: string, movieId: string) => {
  const build = SEARCH_URLS[provider];
  return build ? build(encodeURIComponent(title)) : whereToWatchUrl(movieId);
};

export type PosterInfo = { id: string; title: string; poster: string | null };

/** Poster + title for a list of movie IDs (used by the taste screen). */
export async function fetchPosters(ids: string[]): Promise<Record<string, PosterInfo>> {
  const list = await Promise.all(
    ids.map((id) =>
      fetch(`${BASE}/movie/${id}?api_key=${API_KEY}`)
        .then((r) => r.json())
        .then((d) => ({ id, title: d.title ?? "", poster: img(d.poster_path, "w342") }))
        .catch(() => ({ id, title: "", poster: null }))
    )
  );
  return Object.fromEntries(list.map((p) => [p.id, p]));
}