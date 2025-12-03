// src/lib/adminApi.ts
import axios from "axios";

export const api = axios.create({
  baseURL: "/",
  withCredentials: true,
});

// ---------- Types ----------
export interface AdminGenre {
  genre_id: number;
  name: string;
}

export interface AdminMovie {
  movie_id: number;
  title_local: string;
  release_year?: number;
  is_new?: boolean;
  is_exclusive?: boolean;
  imdb_rating?: number;
  price_rub: number;
}

export interface CreateMovieDto {
  title_local: string;
  title_original: string;
  synopsis: string;
  description_full: string;
  country_text: string;
  release_year: number;
  runtime_min: number;
  age_rating: string;
  imdb_rating: number;
  expected_gross_rub: number;
  price_rub: number;
  discount_rub: number;
  is_new: boolean;
  is_exclusive: boolean;
  genre_ids: number[];
  poster_url: string;
  trailer_url: string;
}

export interface TMDBSearchItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  vote_average?: number;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  first_air_date?: string;
}

// ---------- Helpers ----------
function pickArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

// ---------- Queries ----------
export async function listGenres(): Promise<AdminGenre[]> {
  // trailing slash to avoid proxy 307
  const { data } = await api.get("/api/admin/genres/");
  const raw = pickArray(data);
  return raw.map((g: any) => ({
    genre_id: Number(g.genre_id ?? g.id ?? g.genreId),
    name: String(g.name ?? g.title ?? ""),
  })).filter((g: AdminGenre) => Number.isFinite(g.genre_id) && g.name);
}

export async function getGenres(): Promise<AdminGenre[]> {
  return listGenres();
}

export async function listMovies(opts?: { limit?: number; offset?: number; search?: string; sort?: string }) {
  const params: Record<string, any> = {};
  if (opts?.limit != null) params.limit = opts.limit;
  if (opts?.offset != null) params.offset = opts.offset;
  if (opts?.search) params.search = opts.search;
  if (opts?.sort) params.sort = opts.sort;
  const { data } = await api.get("/api/admin/movies/", { params });
  const raw = pickArray(data);
  return raw.map((m: any) => ({
    movie_id: Number(m.movie_id ?? m.id ?? m.movieId),
    title_local: String(m.title_local ?? m.title ?? m.titleLocalized ?? m.title_original ?? ""),
    release_year: m.release_year ?? m.year,
    is_new: Boolean(m.is_new ?? m.isNew ?? false),
    is_exclusive: Boolean(m.is_exclusive ?? m.isExclusive ?? false),
    imdb_rating: typeof m.imdb_rating === "number" ? m.imdb_rating : Number(m.rating ?? NaN),
    price_rub: Number(m.price_rub ?? m.price ?? 0),
  }));
}

// Create movie
export async function createMovie(payload: CreateMovieDto) {
  const { data } = await api.post("/api/admin/movies/", payload);
  return data;
}

// TMDB search passthrough
export async function tmdbSearch(query: string): Promise<TMDBSearchItem[]> {
  if (!query || !query.trim()) return [];
  const { data } = await api.get("/api/admin/tmdb/search", { params: { query } });
  return pickArray(data);
}

// Get movie genres
export async function getMovieGenres(movieId: number): Promise<number[]> {
  const { data } = await api.get(`/api/admin/movies/${movieId}/genres`);
  return Array.isArray(data) ? data.map(g => g.genre_id || g.id) : [];
}

// Get full movie details
export async function getMovieDetails(movieId: number) {
  const { data } = await api.get(`/api/admin/movies/${movieId}`);
  return data;
}
