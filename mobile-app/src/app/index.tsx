import { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, Pressable } from "react-native";

const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

export default function Index() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [genres, setGenres] = useState<{ id: string; title: string }[]>([]);
  const [movies, setMovies] = useState<{ id: string; title: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    fetch(`https://api.themoviedb.org/3/genre/movie/list?language=en&api_key=${API_KEY}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.genres) {
          setGenres(data.genres.map((g: any) => ({ id: String(g.id), title: g.name })));
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedGenre) return;

    fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&with_genres=${selectedGenre.id}`
    )
      .then((res) => res.json())
      .then((data) => {
        console.log("TMDB response:", data);
        if (data.results) {
          setMovies(data.results.map((m: any) => ({ id: String(m.id), title: m.title })));
          setCurrentIndex(0);
          setLiked([]);
        }
      });
  }, [selectedGenre]);

  const currentMovie = movies[currentIndex];

  const handleLike = () => {
    if (!currentMovie) return;
    setLiked([...liked, currentMovie.title]);
    setCurrentIndex(currentIndex + 1);
  };

  const handlePass = () => {
    if (!currentMovie) return;
    setCurrentIndex(currentIndex + 1);
  };

  // no genre picked yet
  if (!selectedGenre) {
    return (
      <View style={styles.container}>
        {genres.map((g) => (
          <Pressable key={g.id} onPress={() => setSelectedGenre({ id: g.id, title: g.title })}>
            <Text style={{ color: "white" }}>{g.title}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  // genre picked, movies still loading
  if (movies.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading movies...</Text>
      </View>
    );
  }

  // done swiping
  if (currentIndex >= movies.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>You liked: {liked.join(", ") || "nothing"}</Text>
      </View>
    );
  }

  // swiping
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{selectedGenre.title}</Text>
      <Text style={styles.title}>{currentMovie.title}</Text>
      <Button title="Pass" onPress={handlePass} />
      <Button title="Like" onPress={handleLike} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#111", padding: 20 },
  title: { fontSize: 24, marginBottom: 20, color: "white" },
});