import { MovieCard } from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Movie } from "@/api/contentApi";

interface MovieGridProps {
  title: string;
  movies: Movie[];
  onMovieClick?: (movie: Movie) => void;
  isLoading?: boolean;
}

export function MovieGrid({
  title,
  movies,
  onMovieClick,
  isLoading = false,
}: MovieGridProps) {
  const SkeletonGrid = () => (
    <div className="movie-grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="movie-card-container">
          <div className="bg-cinema-gray rounded-lg overflow-hidden">
            <Skeleton className="aspect-[2/3] bg-gray-700" />
            <div className="p-3">
              <Skeleton className="h-4 mb-2 bg-gray-700" />
              <Skeleton className="h-3 mb-1 bg-gray-700" />
              <Skeleton className="h-3 bg-gray-700" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <section className="mb-12" data-testid={`grid-\${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>

      {isLoading ? (
        <SkeletonGrid />
      ) : (
        <div className="movie-grid">
          {movies?.length ? (
            movies.map((movie) => (
              <div key={movie.movie_id} className="movie-card-container">
                <MovieCard
                  movie={movie}
                  onClick={() => onMovieClick?.(movie)}
                />
              </div>
            ))
          ) : (
            <div className="text-gray-400">Ничего не найдено</div>
          )}
        </div>
      )}
    </section>
  );
}

export default MovieGrid;