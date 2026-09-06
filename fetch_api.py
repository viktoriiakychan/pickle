import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("TMDB_API_KEY")

def get_movies():
    response = requests.get(
        "https://api.themoviedb.org/3/discover/movie",
        params={"api_key": api_key, "sort_by": "popularity.desc"} # "with_genres": 35,  # comedy 
    )

    data = response.json()
    return [{"id": str(m["id"]), "title": m["title"]} for m in data["results"]]

def get_movies_with_genre(genre_id):
    response = requests.get(
        "https://api.themoviedb.org/3/discover/movie",
        params={"api_key": api_key,
                "sort_by": "popularity.desc",
                "vote_count.gte": 300,
                "with_genres": genre_id,
            }
    )
    data = response.json()
    return [{"id": str(m["id"]), "title": m["title"]} for m in data["results"]]   

def get_genres():
    response = requests.get(
        "https://api.themoviedb.org/3/genre/movie/list",
        params={"api_key": api_key}
    )

    genres = response.json()
    return genres