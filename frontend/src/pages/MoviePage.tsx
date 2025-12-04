import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Movie } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Heart, Play, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { MovieCarousel } from "@/components/MovieCarousel";
import { Skeleton } from "@/components/ui/skeleton";

export default function MoviePage() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();

  const { data: movie, isLoading } = useQuery<Movie>({
    queryKey: ['/api/movies', id],
    enabled: !!id,
  });

  const { data: similarMovies } = useQuery<Movie[]>({
    queryKey: ['/api/movies', { 
      genres: movie?.genres?.join(','), 
      limit: 10 
    }],
    enabled: !!movie?.genres,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-8 bg-cinema-gray" />
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/3">
              <Skeleton className="aspect-[2/3] bg-cinema-gray rounded-lg" />
            </div>
            <div className="lg:w-2/3 space-y-4">
              <Skeleton className="h-10 w-3/4 bg-cinema-gray" />
              <Skeleton className="h-6 w-1/2 bg-cinema-gray" />
              <div className="grid grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-12 bg-cinema-gray" />
                ))}
              </div>
              <Skeleton className="h-32 bg-cinema-gray" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Фильм не найден</h1>
          <Button asChild className="bg-cinema-red hover:bg-red-700">
            <Link href="/">Вернуться на главную</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-4">
        <Button
          asChild
          variant="ghost"
          className="text-white hover:text-cinema-red"
          data-testid="back-button"
        >
          <Link href="/online">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад к каталогу
          </Link>
        </Button>
      </div>

      {/* Movie Details */}
      <div className="container mx-auto px-4 pb-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Movie Poster */}
          <div className="lg:w-1/3">
            <div className="aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center relative">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-600 rounded-lg flex items-center justify-center">
                  <span className="text-4xl">🎬</span>
                </div>
                <p className="text-gray-400">Постер фильма</p>
              </div>
              
              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {movie.isNewRelease && (
                  <Badge className="bg-cinema-red text-white">Новинка</Badge>
                )}
                {movie.isExclusive && (
                  <Badge className="bg-green-600 text-white">Эксклюзив</Badge>
                )}
                {movie.isOnPromotion && (
                  <Badge className="bg-orange-600 text-white">Акция</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Movie Info */}
          <div className="lg:w-2/3">
            <h1 className="text-4xl font-bold mb-2" data-testid="movie-title">
              {movie.localizedTitle}
            </h1>
            {movie.originalTitle && (
              <h2 className="text-xl text-gray-400 mb-6" data-testid="movie-original-title">
                {movie.originalTitle}
              </h2>
            )}

            {/* Meta Information */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <span className="text-sm text-gray-400">Жанры:</span>
                <p className="text-white">{movie.genres?.join(', ') || 'Не указаны'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Страна:</span>
                <p className="text-white">{movie.country || 'Не указана'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Год выпуска:</span>
                <p className="text-white">{movie.releaseYear}</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Продолжительность:</span>
                <p className="text-white">{movie.duration} минут</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Возрастной рейтинг:</span>
                <p className="text-white">{movie.ageRating || 'Не указан'}</p>
              </div>
              {movie.imdbRating && (
                <div>
                  <span className="text-sm text-gray-400">Рейтинг IMDb:</span>
                  <div className="flex items-center space-x-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="text-white text-lg font-semibold">{movie.imdbRating}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mb-8">
              {movie.isAvailableToWatch && isAuthenticated && user?.subscriptionActive ? (
                <Button 
                  className="bg-cinema-red hover:bg-red-700 text-white px-8 py-3"
                  data-testid="watch-button"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Смотреть
                </Button>
              ) : (
                <Button 
                  disabled
                  className="bg-gray-600 text-gray-400 px-8 py-3 cursor-not-allowed"
                  data-testid="watch-button-disabled"
                >
                  <Play className="w-5 h-5 mr-2" />
                  {!isAuthenticated ? 'Войдите для просмотра' : 
                   !user?.subscriptionActive ? 'Нужна подписка' : 'Недоступно'}
                </Button>
              )}
              
              {isAuthenticated && (
                <Button 
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-black px-8 py-3"
                  data-testid="favorite-button"
                >
                  <Heart className="w-5 h-5 mr-2" />
                  В избранное
                </Button>
              )}
            </div>

            {/* Status */}
            <div className="mb-8">
              <span className="text-sm text-gray-400">Статус:</span>
              <p className={`text-lg font-medium ${
                movie.isAvailableToWatch ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {movie.isAvailableToWatch ? 'Доступен к просмотру' : 'Ожидается релиз'}
              </p>
              {movie.platformReleaseDate && !movie.isAvailableToWatch && (
                <p className="text-sm text-gray-400">
                  Дата релиза: {new Date(movie.platformReleaseDate).toLocaleDateString('ru-RU')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {(movie.shortDescription || movie.fullDescription) && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold mb-4">Описание</h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              {movie.fullDescription || movie.shortDescription}
            </p>
          </div>
        )}

        {/* Trailer */}
        {movie.trailerUrl && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold mb-4">Трейлер</h3>
            <div className="aspect-video bg-cinema-gray rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-gray-600 rounded-lg flex items-center justify-center">
                  <Play className="w-8 h-8 text-white" />
                </div>
                <p className="text-gray-400">Видео трейлер</p>
              </div>
            </div>
          </div>
        )}

        {/* Similar Movies */}
        {similarMovies && similarMovies.length > 0 && (
          <div className="mt-12">
            <MovieCarousel
              title="Похожие фильмы"
              movies={similarMovies.filter(m => m.id !== movie.id).slice(0, 8)}
              onMovieClick={(movie) => {
                // Navigate to the new movie page
                window.location.href = `/movie/${movie.id}`;
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
