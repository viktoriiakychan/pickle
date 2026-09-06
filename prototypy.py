from fetch_api import get_movies, get_genres, get_movies_with_genre
#movies = get_movies()
genres = get_genres()
def swipe_session(name, movies):
    matches = set()
    for movie in movies:
        print(f"Title: {movie['title']}")
        choice = int(input("[1] - yes; [0] - no: "))

        if choice == 1:
            matches.add(movie["id"])

    return matches

def get_matches(room):
    return set.intersection(*room.values())

genre_names = []

for genre in genres["genres"]:
    genre_names.append(genre["name"])

print(genre_names)
choosen_genre = str(input("Choose a genre: "))

# get the acc number from tmdb for the genre
choosen_genre_id = -1

for genre in genres["genres"]:
    if genre["name"].lower() == choosen_genre.lower():
        choosen_genre_id = genre["id"]
#print(choosen_genre_id)

movies = get_movies_with_genre(choosen_genre_id)
print(movies)

# multiple users
user_num = int(input("Enter user number: "))
if user_num != 0:
    room = {}

    for i in range(user_num):
        room[f"User {i+1}"] = swipe_session(f"User {i+1}", movies)


    matches = get_matches(room)

    if matches:
        print("Matches:", sorted(matches))
    else:
        print("No matches found")
else:
    print("Room empty")