// Everything that talks to TMDB lives here.
const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3";

export const DECK_SIZE = 20;

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
};

const img = (path: string | null | undefined, size: string) =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

const formatRuntime = (mins?: number) => {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

/** Builds the shared deck: 20 popular movies in a genre, with runtimes. */
export async function fetchDeck(genre: Genre): Promise<Movie[]> {
  const page = 1 + Math.floor(Math.random() * 3); // a bit of variety between rounds
  const res = await fetch(
    `${BASE}/discover/movie?api_key=${API_KEY}&with_genres=${genre.id}` +
      `&sort_by=popularity.desc&vote_count.gte=150&include_adult=false&page=${page}`
  );
  const data = await res.json();
  const results: any[] = (data.results ?? []).slice(0, DECK_SIZE);

  // runtime isn't in /discover, so grab it per movie (20 small requests, in parallel)
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

export async function fetchDetails(movieId: string): Promise<MovieDetails> {
  try {
    const [creditsRes, videosRes] = await Promise.all([
      fetch(`${BASE}/movie/${movieId}/credits?api_key=${API_KEY}`),
      fetch(`${BASE}/movie/${movieId}/videos?api_key=${API_KEY}`),
    ]);
    const credits = await creditsRes.json();
    const videos = await videosRes.json();
    const cast = (credits.cast ?? []).slice(0, 8).map((c: any) => ({
      name: c.name,
      character: c.character,
      photo: img(c.profile_path, "w185"),
    }));
    const trailer = (videos.results ?? []).find(
      (v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
    );
    return { cast, trailerKey: trailer?.key ?? null };
  } catch {
    return { cast: [], trailerKey: null };
  }
}

/** TMDB's "where to watch" page (streaming services for Ireland). */
export const whereToWatchUrl = (movieId: string) =>
  `https://www.themoviedb.org/movie/${movieId}/watch?locale=IE`;

/** "2026 · ★ 7.6 · 1h 52m", skipping anything missing */
export const metaLine = (m: Pick<Movie, "year" | "rating" | "runtime">, withRuntime = true) =>
  [m.year, m.rating && `★ ${m.rating}`, withRuntime && m.runtime].filter(Boolean).join(" · ");
