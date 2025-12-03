import { Star } from "lucide-react";

export type MovieCardMovie = {
  movie_id?: number | null;
  movieId?: number | null;
  id?: number | string | null;
  title_local?: string | null;
  titleLocalized?: string | null;
  localizedTitle?: string | null;
  title?: string | null;
  poster_url?: string | null;
  posterUrl?: string | null;
  poster?: string | null;
  genres?: Array<string | { name?: string | null } | { genre?: { name?: string | null } | null }> | null;
  runtime_min?: number | string | null;
  durationMin?: number | string | null;
  duration?: number | string | null;
  release_year?: number | string | null;
  year?: number | string | null;
  releaseYear?: number | string | null;
  imdb_rating?: number | string | null;
  ratingImdb?: number | string | null;
  imdbRating?: number | string | null;
  country_text?: string | null;
  country?: string | null;
  countryText?: string | null;
  is_new?: boolean | null;
  isNew?: boolean | null;
  is_new_release?: boolean | null;
  isNewRelease?: boolean | null;
  is_exclusive?: boolean | null;
  isExclusive?: boolean | null;
};

interface MovieCardProps {
  movie: MovieCardMovie;
  onClick?: () => void;
}

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const extractGenres = (items?: MovieCardMovie["genres"]): string[] => {
  if (!items) return [];
  return items
    .map((item) => {
      if (!item) return undefined;
      if (typeof item === "string") return item.trim();
      if (typeof (item as { name?: string }).name === "string") return (item as { name?: string }).name ?? undefined;
      const nested = (item as { genre?: { name?: string | null } }).genre?.name;
      return typeof nested === "string" ? nested : undefined;
    })
    .filter((name): name is string => Boolean(name && name.trim()))
    .map((name) => name.trim());
};

const pickTitle = (movie: MovieCardMovie): string =>
  movie.title_local ??
  movie.titleLocalized ??
  movie.localizedTitle ??
  movie.title ??
  "Название не указано";

const pickPoster = (movie: MovieCardMovie): string | undefined =>
  movie.poster_url ?? movie.posterUrl ?? movie.poster ?? undefined;

const pickMovieId = (movie: MovieCardMovie): number | string =>
  movie.movie_id ?? movie.movieId ?? movie.id ?? pickTitle(movie);

const pickCountry = (movie: MovieCardMovie): string | undefined =>
  movie.country_text ?? movie.countryText ?? movie.country ?? undefined;

const pickRating = (movie: MovieCardMovie): number | undefined =>
  toNumber(movie.imdb_rating ?? movie.ratingImdb ?? movie.imdbRating);

const pickReleaseYear = (movie: MovieCardMovie): string | undefined => {
  const value = movie.release_year ?? movie.releaseYear ?? movie.year;
  return value !== undefined && value !== null ? String(value) : undefined;
};

const pickDuration = (movie: MovieCardMovie): number | undefined =>
  toNumber(movie.runtime_min ?? movie.durationMin ?? movie.duration);

const pickIsNew = (movie: MovieCardMovie): boolean =>
  Boolean(movie.is_new ?? movie.isNew ?? movie.isNewRelease ?? movie.is_new_release);

const pickIsExclusive = (movie: MovieCardMovie): boolean =>
  Boolean(movie.is_exclusive ?? movie.isExclusive);

export function MovieCard({ movie, onClick }: MovieCardProps) {
  const title = pickTitle(movie);
  const posterUrl = pickPoster(movie);
  const movieKey = pickMovieId(movie);
  const genres = extractGenres(movie.genres);
  const duration = pickDuration(movie);
  const releaseYear = pickReleaseYear(movie);
  const rating = pickRating(movie);
  const country = pickCountry(movie);
  const isNew = pickIsNew(movie);
  const isExclusive = pickIsExclusive(movie);

  return (
    <div
      className="group cursor-pointer transition-all duration-300 w-full h-full"
      onClick={onClick}
      data-testid={`movie-card-${String(movieKey)}`}
      style={{ aspectRatio: "240/380", minHeight: "300px", transform: "translateZ(0)" }}
    >
      <div className="relative transition-all duration-300 group-hover:scale-105 w-full h-full flex flex-col bg-[#1B1B1D] rounded-xl shadow-lg overflow-hidden">
        <div className="relative h-[70%] bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {isNew && (
              <span className="bg-red-600/90 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
                Новинка
              </span>
            )}
            {isExclusive && (
              <span className="bg-yellow-600/90 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
                Эксклюзив
              </span>
            )}
          </div>

          {posterUrl ? (
            <img src={posterUrl} alt={`Постер фильма ${title}`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
              <div className="text-center text-gray-300 text-xs">Изображение отсутствует</div>
            </div>
          )}
        </div>

        <div className="flex flex-col flex-shrink-0 h-[30%] p-3">
          <div className="flex-1 min-h-0 flex flex-col">
            <h3
              className="font-medium text-white mb-1 text-sm leading-tight line-clamp-2"
              data-testid={`movie-title-${String(movieKey)}`}
              title={title}
            >
              {title}
            </h3>

            <p className="text-gray-400 mb-1 text-xs truncate" title={genres.join(", ")}>
              {genres.length > 0 ? genres.join(", ") : "Жанры не указаны"}
            </p>

            <div className="flex items-center justify-between mb-1 text-xs text-gray-400">
              <span>{releaseYear || "Год неизвестен"}</span>
              {duration !== undefined && <span>{duration} мин</span>}
            </div>

            <div className="flex items-center justify-between text-xs">
              {rating !== undefined && (
                <div className="flex items-center text-white">
                  <Star className="w-3 h-3 text-yellow-500 mr-1" fill="currentColor" />
                  <span>{rating.toFixed(1)}</span>
                </div>
              )}
              {country && (
                <span className="text-gray-500 truncate" title={country}>
                  {country}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
