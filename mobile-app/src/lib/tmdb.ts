const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3";

export const DECK_SIZE = 20;
export const MAX_DECK = 30; // deck can grow to this with "Seen it" replacements

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

/** Builds the shared deck: a shuffled 20 from approx 60 popular movies in a genre. */
const discoverUrl = (genre: Genre, page: number) =>
  `${BASE}/discover/movie?api_key=${API_KEY}&with_genres=${genre.id}` +
  `&sort_by=popularity.desc&vote_count.gte=300&include_adult=false&page=${page}`;

const randomPage = () => 1 + Math.floor(Math.random() * 10);

/** Turns raw TMDB results into our Movie type (runtime needs one extra request each). */
async function toMovies(results: any[]): Promise<Movie[]> {
  const runtimes = await Promise.all(
    results.map((m) =>
      fetch(`${BASE}/movie/${m.id}?api_key=${API_KEY}`)
        .then((r) => r.json())
        .then((d) => formatRuntime(d.runtime))
        .catch(() => "")
    )
  );
  return results.map((m, i) => ({
    id: String(m.id),
    title: m.title,
    year: m.release_date ? m.release_date.slice(0, 4) : "",
    rating: typeof m.vote_average === "number" ? m.vote_average.toFixed(1) : "",
    runtime: runtimes[i],
    overview: m.overview ?? "",
    poster: img(m.poster_path, "w500"),
    backdrop: img(m.backdrop_path, "w780"),
  }));
}

/** Builds the shared deck: a shuffled 20 from 60 popular movies, minus anything seen. */
export async function fetchDeck(genre: Genre, seen: Set<string> = new Set()): Promise<Movie[]> {
  const responses = await Promise.all(
    [1, 2, 3].map(() => fetch(discoverUrl(genre, randomPage())).then((r) => r.json()))
  );
  const all = responses.flatMap((d) => d.results ?? []);
  const unique = [...new Map(all.map((m: any) => [m.id, m])).values()];
  const fresh = unique.filter((m: any) => !seen.has(String(m.id)));
  return toMovies(shuffle(fresh).slice(0, DECK_SIZE));
}

/** One extra movie for "Seen it", skipping anything in `exclude`. Tries 3 random pages. */
export async function fetchReplacement(genre: Genre, exclude: Set<string>): Promise<Movie | null> {
  for (let tries = 0; tries < 3; tries++) {
    const data = await fetch(discoverUrl(genre, randomPage())).then((r) => r.json());
    const options = (data.results ?? []).filter((m: any) => !exclude.has(String(m.id)));
    if (options.length) {
      const [movie] = await toMovies(shuffle(options).slice(0, 1));
      return movie;
    }
  }
  return null; // couldn't find one, the deck just stays shorter
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