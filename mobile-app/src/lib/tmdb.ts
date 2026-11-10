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

/** Why a card is in the deck, so the swipe screen can say "Brine's pick" etc. */
export type MovieTag = {
  kind: "everyone" | "blend" | "pick"; // everyone picked this genre / two genres mixed / one person's pick
  genres: string[];                    // genre ids it came from
  by?: string;                         // player id, for "pick"
};

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
  tag?: MovieTag;
  addedBy?: { id: string; name: string }; // extra card: added mid-round because this person had seen one
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

/**
 * What to ask TMDB for. In with_genres, "35,10749" means BOTH (rom-coms),
 * "35|10749" means EITHER. without_genres = the "not tonight" genres.
 */
export type Query = { with: string; without: string };

const discoverUrl = (q: Query, level: Level, page: number) => {
  const c = LEVELS[level];
  return (
    `${BASE}/discover/movie?api_key=${API_KEY}&include_adult=false` +
    (q.with ? `&with_genres=${encodeURIComponent(q.with)}` : "") +
    (q.without ? `&without_genres=${encodeURIComponent(q.without)}` : "") +
    `&sort_by=${c.sort}&vote_count.gte=${c.minVotes}&vote_average.gte=${c.minRating}` +
    (c.englishOnly ? "&with_original_language=en" : "") +
    `&page=${page}`
  );
};

/** ~60 movies for this query + level, from random pages that actually exist. */
async function fetchPool(q: Query, level: Level): Promise<any[]> {
  const [lo, hi] = LEVELS[level].pages;

  // page 1 tells us how many pages exist for this genre + level
  const first = await fetch(discoverUrl(q, level, 1)).then((r) => r.json());
  const total = Math.min(first.total_pages ?? 1, 500); // TMDB never goes past page 500
  const from = lo <= total ? lo : 1;
  const to = Math.max(from, Math.min(hi, total));
  const pages = [1, 2, 3].map(() => from + Math.floor(Math.random() * (to - from + 1)));

  const responses = await Promise.all(pages.map((p) => fetch(discoverUrl(q, level, p)).then((r) => r.json())));
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

/** "If you liked X" for each favourite, best matches first (genre filtering happens per bucket). */
async function recommendedFor(favs: string[], level: Level): Promise<any[]> {
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

/* ── building the deck from everyone's genre picks ───────────────────────

   Example: you pick Romance + Comedy, Brine picks Comedy + Horror,
   and Brine says "not tonight" to Drama.
   1. "Not tonight" always wins: Drama is removed from every request.
   2. Comedy was picked by everyone → about half the deck.
   3. Blend: the best pair of the other genres (Romance + Horror here),
      asked for as BOTH, so you get movies that are really a mix.
   4. Fair split: the rest is shared equally between each person's picks.
   5. Anything short gets topped up from the other buckets.
   Solo works the same way with one person: 2 genres = blend + either.        */

export type MoodInput = { id: string; genres: string[]; no: string | null }; // genres [] = "Surprise me"

type Bucket = { q: Query; match: (m: any) => boolean; target: number; tag: MovieTag };

const titleOf = (id: string) => GENRES.find((g) => g.id === id)?.title ?? "";

/** Pure planning step (no network): which requests to make and how many cards from each. */
export function planDeck(moods: MoodInput[]): { buckets: Bucket[]; plan: Query; label: string } {
  const vetoes = [...new Set(moods.map((m) => m.no).filter((g): g is string => !!g))];
  const without = vetoes.join(",");
  const has = (m: any, g: string) => !!m.genre_ids?.includes(Number(g));
  const allowed = (m: any) => !vetoes.some((v) => has(m, v));
  const either = (gs: string[]): Query => ({ with: gs.join("|"), without });
  const both = (gs: string[]): Query => ({ with: gs.join(","), without });

  // vetoed genres are dropped from everyone's picks; "Surprise me" people don't pull the deck anywhere
  const people = moods
    .map((m) => ({ ...m, genres: m.genres.filter((g) => !vetoes.includes(g)) }))
    .filter((p) => p.genres.length > 0);

  if (!people.length) {
    const q = { with: "", without };
    return {
      buckets: [{ q, match: allowed, target: DECK_SIZE, tag: { kind: "pick", genres: [] } }],
      plan: q,
      label: "Surprise",
    };
  }

  // how many people picked each genre, most popular first
  const count = new Map<string, number>();
  people.forEach((p) => p.genres.forEach((g) => count.set(g, (count.get(g) ?? 0) + 1)));
  const all = shuffle([...count.keys()]).sort((a, b) => count.get(b)! - count.get(a)!);

  const group = people.length > 1;
  const everyone = group ? all.filter((g) => count.get(g) === people.length) : [];
  const buckets: Bucket[] = [];
  let left = DECK_SIZE;

  // 1. genres everyone picked
  if (everyone.length) {
    const onlyThose = people.every((p) => p.genres.every((g) => everyone.includes(g)));
    const n = onlyThose ? DECK_SIZE : Math.round(DECK_SIZE / 2);
    buckets.push({
      q: either(everyone),
      match: (m) => allowed(m) && everyone.some((g) => has(m, g)),
      target: n,
      tag: { kind: "everyone", genres: everyone },
    });
    left -= n;
  }

  // 2. blends (movies that are BOTH genres)
  const blend = (pair: [string, string], n: number) => {
    if (n <= 0) return;
    buckets.push({
      q: both(pair),
      match: (m) => allowed(m) && has(m, pair[0]) && has(m, pair[1]),
      target: n,
      tag: { kind: "blend", genres: pair },
    });
    left -= n;
  };

  if (everyone.length) {
    // shared genre + each person's other pick, so everyone gets a blend: rom-com for you, horror-comedy for Brine
    const pairs = people
      .map((p) => p.genres.find((g) => !everyone.includes(g)))
      .filter((g): g is string => !!g)
      .filter((g, i, gs) => gs.indexOf(g) === i)
      .map((g) => [everyone[0], g] as [string, string]);
    const budget = Math.min(left, 2 * pairs.length, 6);
    pairs.forEach((pair, i) => blend(pair, Math.floor(budget / pairs.length) + (i < budget % pairs.length ? 1 : 0)));
  } else if (!group && all.length >= 2) {
    // solo with 2 genres = you want the mix: as many "both" movies as exist,
    // and only top up with either genre if TMDB runs out (rare combos like Horror + Romance)
    blend([all[0], all[1]], left);
    const p = people[0];
    buckets.push({
      q: either(p.genres),
      match: (m) => allowed(m) && p.genres.some((g) => has(m, g)),
      target: 0, // backup only: used by the top-up step
      tag: { kind: "pick", genres: p.genres, by: p.id },
    });
  } else if (all.length >= 2) {
    // group, no shared genre: one blend of the two most-picked genres
    blend([all[0], all[1]], Math.min(left, 8));
  }

  // 3. fair split of what's left between each person's own picks
  people.forEach((p, i) => {
    const n = Math.floor(left / people.length) + (i < left % people.length ? 1 : 0);
    if (n <= 0) return;
    buckets.push({
      q: either(p.genres),
      match: (m) => allowed(m) && p.genres.some((g) => has(m, g)),
      target: n,
      tag: { kind: "pick", genres: p.genres, by: p.id },
    });
  });

  // deck name for the swipe pill / results / saved list: "Comedy + Romance", "Comedy + 2 more"
  const titles = all.map(titleOf);
  const label = titles.length <= 2 ? titles.join(" + ") : `${titles[0]} + ${titles.length - 1} more`;

  return { buckets, plan: either(all), label };
}

/** Builds the shared deck for everyone's picks, minus anything anyone has seen. */
export async function buildDeck(
  moods: MoodInput[],
  seen: Set<string> = new Set(),
  favs: string[] = [],
  level: Level = "casual"
): Promise<{ deck: Movie[]; plan: Query; label: string }> {
  const { buckets, plan, label } = planDeck(moods);
  const fresh = (m: any) => !seen.has(String(m.id));

  const [recs, pools] = await Promise.all([
    favs.length ? recommendedFor(favs, level).catch(() => []) : Promise.resolve([]),
    Promise.all(buckets.map((b) => fetchPool(b.q, level).catch(() => [] as any[]))),
  ]);

  const used = new Set<number>();
  const chosen: { m: any; tag: MovieTag }[] = [];
  let forYouLeft = FOR_YOU;

  buckets.forEach((b, i) => {
    let n = 0;
    // "for you" recommendations that fit this bucket go first
    for (const m of recs) {
      if (n >= b.target || forYouLeft <= 0) break;
      if (used.has(m.id) || !fresh(m) || !b.match(m)) continue;
      used.add(m.id);
      chosen.push({ m, tag: b.tag });
      n++;
      forYouLeft--;
    }
    for (const m of shuffle(pools[i])) {
      if (n >= b.target) break;
      if (used.has(m.id) || !fresh(m) || !b.match(m)) continue;
      used.add(m.id);
      chosen.push({ m, tag: b.tag });
      n++;
    }
  });

  // a bucket came up short (rare blend, picky level): top up from the others
  if (chosen.length < DECK_SIZE) {
    const spare = shuffle(pools.flatMap((pool, i) => pool.map((m) => ({ m, tag: buckets[i].tag }))));
    for (const x of spare) {
      if (chosen.length >= DECK_SIZE) break;
      if (used.has(x.m.id) || !fresh(x.m)) continue;
      used.add(x.m.id);
      chosen.push(x);
    }
  }

  // "pick" cards: keep only the picked genres this movie really has, so solo can say "Romance" not "Horror + Romance"
  chosen.forEach((x) => {
    if (x.tag.kind !== "pick" || !x.tag.genres.length) return;
    const real = x.tag.genres.filter((g) => x.m.genre_ids?.includes(Number(g)));
    if (real.length) x.tag = { ...x.tag, genres: real };
  });

  // every card would say the same thing (e.g. solo, one genre) → no labels
  const sameTag = new Set(chosen.map((x) => JSON.stringify(x.tag))).size <= 1;

  const picked = shuffle(chosen.slice(0, DECK_SIZE));
  const movies = await toMovies(picked.map((x) => x.m));
  // only add `tag` when there is one: Firestore rejects undefined values
  const deck = movies.map((mv, i) => (sameTag ? mv : { ...mv, tag: picked[i].tag }));
  return { deck, plan, label };
}

/** One extra movie for "Seen it", from the room's genres, skipping anything in `exclude`. */
export async function fetchReplacement(
  plan: Query,
  exclude: Set<string>,
  level: Level = "casual"
): Promise<Movie | null> {
  const options = (await fetchPool(plan, level)).filter((m: any) => !exclude.has(String(m.id)));
  if (!options.length) return null;
  const [movie] = await toMovies(shuffle(options).slice(0, 1));
  return movie;
}

/**
 * Can this YouTube video play inside our app? Asks YouTube's public oEmbed (free, no key, works from a browser).
 * true = yes. false = owner turned off embedding (401), or it's private / removed (404).
 * null = couldn't ask (offline, blocked…): we'll just try it and see.
 */
async function canEmbed(key: string): Promise<boolean | null> {
  try {
    const watch = encodeURIComponent(`https://www.youtube.com/watch?v=${key}`);
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${watch}`);
    return res.ok;
  } catch {
    return null;
  }
}

/** First trailer that will definitely play; if we couldn't check, the first one we might be able to. */
async function firstPlayable(keys: string[]): Promise<string | null> {
  if (!keys.length) return null;
  const ok = await Promise.all(keys.map(canEmbed)); // checked side by side, not one after another
  return keys[ok.indexOf(true)] ?? keys[ok.indexOf(null)] ?? null;
}

export async function fetchDetails(movieId: string): Promise<MovieDetails> {
  try {
    const res = await fetch(
      `${BASE}/movie/${movieId}?api_key=${API_KEY}&append_to_response=credits,videos,watch/providers`
    );
    const d = await res.json();
    // official trailers first, then teasers. Try up to 3 and keep the first one YouTube lets us play.
    const candidates: string[] = (d.videos?.results ?? [])
      .filter((v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"))
      .sort((a: any, b: any) => (a.type === "Trailer" ? 0 : 2) + (a.official ? 0 : 1) - ((b.type === "Trailer" ? 0 : 2) + (b.official ? 0 : 1)))
      .slice(0, 3)
      .map((v: any) => v.key);
    const trailerKey = await firstPlayable(candidates);
    return {
      cast: (d.credits?.cast ?? []).slice(0, 8).map((c: any) => ({
        name: c.name, character: c.character, photo: img(c.profile_path, "w185"),
      })),
      trailerKey,
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