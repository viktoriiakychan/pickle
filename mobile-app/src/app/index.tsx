import { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet, Pressable } from "react-native";

const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

export default function Index() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [genres, setGenres] = useState<{ id: string; title: string }[]>([]);
  const [movies, setMovies] = useState<{ id: string; title: string }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<{ id: string; title: string } | null>(null);
  const [page, setPage] = useState(1);

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
      `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&with_genres=${selectedGenre.id}&page=${page}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.results) {
          const newMovies = data.results.map((m: any) => ({ id: String(m.id), title: m.title }));
          setMovies((prev) => [...prev, ...newMovies]);
        }
      });
  }, [selectedGenre, page]);

  const currentMovie = movies[currentIndex];

  const advance = () => {
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    if (nextIndex >= movies.length - 5) {
      setPage((prev) => prev + 1);
    }
  };

  const handleLike = () => {
    if (!currentMovie) return;
    setLiked([...liked, currentMovie.title]);
    advance();
  };

  const handlePass = () => {
    if (!currentMovie) return;
    advance();
  };

  const handleFinish = () => {
    setCurrentIndex(movies.length);
  };

  // no genre picked yet
  if (!selectedGenre) {
    return (
      <View style={styles.container}>
        {genres.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => {
              setSelectedGenre({ id: g.id, title: g.title });
              setMovies([]);
              setPage(1);
              setCurrentIndex(0);
            }}
          >
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
      <Button title="Finish" onPress={handleFinish} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#111", padding: 20 },
  title: { fontSize: 24, marginBottom: 20, color: "white" },
});