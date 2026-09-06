movies = [
    {"id": "1", "title": "The Housemaid", "genre": "Horror"},
    {"id": "2", "title": "10 Things I Hate About You", "genre": "Romance"},
    {"id": "3", "title": "Rush Hour", "genre": "Comedy"},
    {"id": "4", "title": "Mean Girls", "genre": "Comedy"},
    {"id": "5", "title": "The Conjuring", "genre": "Horror"},
    {"id": "6", "title": "La La Land", "genre": "Romance"},
    {"id": "7", "title": "Inception", "genre": "Sci-Fi"},
    {"id": "8", "title": "Knives Out", "genre": "Mystery"},
    {"id": "9", "title": "The Grand Budapest Hotel", "genre": "Comedy"},
    {"id": "10", "title": "A Quiet Place", "genre": "Horror"},
]

print("Select ur movie: [1] - yes; [0] - no")

def swipe_session(name, movies):
    matches = set()
    for movie in movies:
        print(f"Title: {movie['title']}")
        choice = int(input("[1] - yes; [0] - no: "))

        if choice == 1:
            matches.add(movie["id"])

    return matches

# user1_likes = swipe_session("Olivia", movies)
# user2_likes = swipe_session("Lily", movies)

# room = {
#     "Olivia": user1_likes,
#     "Lily": user2_likes
# }

def get_matches(room):
    return set.intersection(*room.values())


# matches = get_matches(room)

# if matches:
#     print("Matches:", matches)
# else:
#     print("No matches found")
        

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