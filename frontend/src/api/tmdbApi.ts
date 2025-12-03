
// src/api/tmdbApi.ts
export type TmdbShort = { id: number; title: string; original_title: string; release_year?: string };
export type TmdbDetails = {
  title?: string;
  original_title?: string;
  overview?: string;
  release_year?: string;
  runtime?: number;
  vote_average?: number;
  poster_url?: string | null;
  trailer_url?: string | null;
  countries?: string;
  genres?: Array<{ name: string }>;
};

export async function tmdbSearch(q: string): Promise<TmdbShort[]> {
  const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`, { credentials: 'include' });
  if (!res.ok) throw new Error('tmdb search failed');
  const data = await res.json();
  return Array.isArray(data?.results) ? data.results : [];
}

export async function tmdbMovie(id: number): Promise<TmdbDetails> {
  const res = await fetch(`/api/tmdb/movie/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error('tmdb details failed');
  return await res.json();
}
