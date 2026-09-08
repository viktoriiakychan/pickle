import { useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";

const movies = [
  { id: "1", title: "Toy Story" },
  { id: "2", title: "Pulp Fiction" },
  { id: "3", title: "Deadpool & Wolverine" },
];

export default function Index() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);

  if (currentIndex >= movies.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>You liked: {liked.join(", ") || "nothing"}</Text>
      </View>
    );
  }

  const currentMovie = movies[currentIndex];

  const handleLike = () => {
    setLiked([...liked, currentMovie.id]);
    setCurrentIndex(currentIndex + 1);
  };

  const handlePass = () => {
    setCurrentIndex(currentIndex + 1);
  };

  return (
    <View style={styles.container}>
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