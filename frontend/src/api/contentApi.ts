import { apiRequest } from "@/lib/queryClient";
import type { OfflineMovie } from "@/types/movies";

export interface Movie {
  movie_id: number;
  title_local: string;
  title_original?: string;
  synopsis?: string;
  description_full?: string;
  release_year?: number;
  genres: Genre[];
  poster_url?: string;
  trailer_url?: string;
  runtime_min?: number;
  country_text?: string;
  is_new?: boolean;
  is_exclusive?: boolean;
  imdb_rating?: number;
  age_rating?: string;
  price_rub?: number;
}

export interface Genre {
  genre_id: number;
  name: string;
}

export interface MoviesResponse {
  movies: Movie[];
  total: number;
  limit: number;
  offset: number;
  has_next: boolean;
}

interface MovieListParams {
  search?: string;
  genre_id?: number;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: string;
}

export async function getMovies(params: MovieListParams = {}): Promise<MoviesResponse> {
  const queryParams = new URLSearchParams();
  
  if (params.search) queryParams.set('search', params.search);
  if (params.genre_id) queryParams.set('genre_id', params.genre_id.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());
  if (params.sort_by) queryParams.set('sort_by', params.sort_by);
  if (params.sort_order) queryParams.set('sort_order', params.sort_order);

  const response = await apiRequest('GET', `/api/content/movies?${queryParams}`);
  return response.json();
}

export async function getMovieById(movieId: number): Promise<Movie> {
  const response = await apiRequest('GET', `/api/content/movies/${movieId}`);
  return response.json();
}

export async function getGenres(): Promise<Genre[]> {
  const response = await apiRequest('GET', `/api/content/genres/`);
  return response.json();
}
