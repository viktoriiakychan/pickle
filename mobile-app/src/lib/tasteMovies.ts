// The fixed "pick movies you love" list. Hand-picked so everyone recognises them.
export type Vibe = "feel-good" | "funny" | "romantic" | "thrilling" | "scary" | "mind-bending" | "emotional";
export type TasteMovie = { id: string; title: string; vibe: Vibe };

export const MIN_FAVS = 3;
export const MAX_FAVS = 5;

export const TASTE_MOVIES: TasteMovie[] = [
  { id: "155", title: "The Dark Knight", vibe: "thrilling" },
  { id: "76341", title: "Mad Max: Fury Road", vibe: "thrilling" },
  { id: "299534", title: "Avengers: Endgame", vibe: "thrilling" },
  { id: "361743", title: "Top Gun: Maverick", vibe: "thrilling" },
  { id: "157336", title: "Interstellar", vibe: "mind-bending" },
  { id: "27205", title: "Inception", vibe: "mind-bending" },
  { id: "603", title: "The Matrix", vibe: "mind-bending" },
  { id: "438631", title: "Dune", vibe: "mind-bending" },
  { id: "8363", title: "Superbad", vibe: "funny" },
  { id: "10625", title: "Mean Girls", vibe: "funny" },
  { id: "18785", title: "The Hangover", vibe: "funny" },
  { id: "346698", title: "Barbie", vibe: "funny" },
  { id: "313369", title: "La La Land", vibe: "romantic" },
  { id: "11036", title: "The Notebook", vibe: "romantic" },
  { id: "4348", title: "Pride & Prejudice", vibe: "romantic" },
  { id: "597", title: "Titanic", vibe: "romantic" },
  { id: "419430", title: "Get Out", vibe: "scary" },
  { id: "138843", title: "The Conjuring", vibe: "scary" },
  { id: "493922", title: "Hereditary", vibe: "scary" },
  { id: "496243", title: "Parasite", vibe: "thrilling" },
  { id: "129", title: "Spirited Away", vibe: "feel-good" },
  { id: "354912", title: "Coco", vibe: "feel-good" },
  { id: "324857", title: "Spider-Man: Into the Spider-Verse", vibe: "feel-good" },
  { id: "14160", title: "Up", vibe: "emotional" },
  { id: "278", title: "The Shawshank Redemption", vibe: "emotional" },
  { id: "13", title: "Forrest Gump", vibe: "emotional" },
  { id: "680", title: "Pulp Fiction", vibe: "thrilling" },
  { id: "244786", title: "Whiplash", vibe: "thrilling" },
];