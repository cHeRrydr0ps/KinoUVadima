import { useRef } from "react";
import { MovieCard, MovieCardMovie } from "./MovieCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MovieCarouselProps {
  title?: string;
  movies: MovieCardMovie[];
  onMovieClick?: (movie: MovieCardMovie) => void;
}

export function MovieCarousel({
  title = "",
  movies = [],
  onMovieClick,
}: MovieCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dx, behavior: "smooth" });
  };

  if (!movies?.length) {
    return null;
  }

  return (
    <section className="w-full">
      {!!title && <h2 className="text-xl font-semibold mb-3">{title}</h2>}
      <div className="relative">
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 z-10">
          <Button variant="secondary" size="icon" onClick={() => scroll(-400)} aria-label="Назад">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </div>
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-10">
          <Button variant="secondary" size="icon" onClick={() => scroll(400)} aria-label="Вперёд">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div
          ref={scrollRef}
          className="flex overflow-x-auto no-scrollbar gap-3 pr-8"
          style={{ scrollSnapType: "x proximity" }}
        >
          {movies.map((movie, index) => {
            const key = movie.movie_id ?? movie.movieId ?? movie.id ?? `${title}-${index}`;
            return (
              <div
                key={String(key)}
                className="flex-none"
                style={{ scrollSnapAlign: "start" }}
              >
                <MovieCard
                  movie={movie}
                  onClick={() => onMovieClick?.(movie)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
