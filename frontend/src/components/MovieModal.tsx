import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Clock, Calendar, Globe, Film, ShoppingCart } from "lucide-react";
import { useLocation } from "wouter";
import type { Movie } from "@/api/contentApi";

// Функция для конвертации URL в embed формат
function convertToEmbedUrl(url?: string): string {
  if (!url) return '';
  
  try {
    // Проверяем, что URL валидный
    new URL(url);
  } catch {
    console.warn('Invalid trailer URL:', url);
    return '';
  }
  
  // YouTube URLs
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    if (videoId) return `https://www.youtube.com/embed/${videoId}?rel=0`;
  }
  
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    if (videoId) return `https://www.youtube.com/embed/${videoId}?rel=0`;
  }
  
  // Vimeo URLs
  if (url.includes('vimeo.com/')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    if (videoId) return `https://player.vimeo.com/video/${videoId}`;
  }
  
  // Rutube URLs
  if (url.includes('rutube.ru/video/')) {
    const videoId = url.split('/video/')[1]?.split('/')[0];
    if (videoId) return `https://rutube.ru/play/embed/${videoId}`;
  }
  
  // VK Video URLs
  if (url.includes('vk.com/video')) {
    return url.replace('vk.com/video', 'vk.com/video_ext.php');
  }
  
  // Если URL уже в формате embed или неизвестный хостинг - возвращаем как есть
  return url;
}

interface MovieModalProps {
  movie: Movie | null;
  open: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

export function MovieModal({ movie, open, onClose, isLoading = false }: MovieModalProps) {
  const genres = movie?.genres?.map(g => g.name) || [];
  const [, setLocation] = useLocation();

  const priceLabel = movie?.price_rub ? `${movie.price_rub.toFixed(2)} ₽` : null;
  
  // Проверяем, есть ли описание для aria-describedby
  const hasDescription = movie?.synopsis || movie?.description_full;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="bg-cinema-gray/95 backdrop-blur-md border-gray-600 max-w-6xl max-h-[95vh] overflow-y-auto modal-scroll"
        style={{ backgroundColor: 'rgba(27, 27, 29, 0.98)' }}
        data-testid={`movie-modal-${movie?.movie_id || 'loading'}`}
        {...(hasDescription && { "aria-describedby": "movie-description" })}
      >
        {isLoading ? (
          // Loading state
          <div className="space-y-6">
            <DialogHeader>
              <Skeleton className="h-8 w-3/4 bg-gray-700" />
              <Skeleton className="h-6 w-1/2 bg-gray-700" />
            </DialogHeader>
            
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="lg:w-1/3">
                <Skeleton className="aspect-[2/3] bg-gray-700 rounded-xl" />
              </div>
              <div className="lg:w-2/3 space-y-4">
                <Skeleton className="h-6 w-full bg-gray-700" />
                <Skeleton className="h-6 w-3/4 bg-gray-700" />
                <Skeleton className="h-24 w-full bg-gray-700" />
              </div>
            </div>
          </div>
        ) : movie ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold text-white mb-2">
                {movie.title_local}
              </DialogTitle>
              {movie.title_original && movie.title_original !== movie.title_local && (
                <p className="text-xl text-gray-400 font-medium">
                  {movie.title_original}
                </p>
              )}
            </DialogHeader>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left side - Poster */}
              <div className="lg:w-1/3">
                <div className="aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl overflow-hidden shadow-2xl">
                  {movie.poster_url ? (
                    <img 
                      src={movie.poster_url} 
                      alt={`Постер фильма ${movie.title_local}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.poster-placeholder')) {
                          const placeholder = document.createElement('div');
                          placeholder.className = 'poster-placeholder w-full h-full flex items-center justify-center';
                          placeholder.innerHTML = `
                            <div class="text-center">
                              <div class="w-24 h-24 mx-auto mb-4 bg-gray-600/50 rounded-lg flex items-center justify-center">
                                <span class="text-4xl">🎬</span>
                              </div>
                              <p class="text-gray-400">Постер недоступен</p>
                            </div>
                          `;
                          parent.appendChild(placeholder);
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-4 bg-gray-600/50 rounded-lg flex items-center justify-center">
                          <span className="text-4xl">🎬</span>
                        </div>
                        <p className="text-gray-400">Постер фильма</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 space-y-3">              
                  {priceLabel && (
                    <Button
                      className="w-full bg-cinema-red hover:bg-red-700"
                      onClick={() => setLocation(`/purchase/${movie.movie_id}`)}
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Купить фильм
                    </Button>
                  )}
                  {movie.trailer_url && (
                    <Button
                      variant="outline"
                      className="w-full border-gray-500 text-gray-300 hover:bg-gray-700"
                      onClick={() => {
                        // Прокрутить к трейлеру
                        document.getElementById('trailer-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <Film className="w-5 h-5 mr-2" />
                      Смотреть трейлер
                    </Button>
                  )}
                </div>
              </div>

              {/* Right side - Info */}
              <div className="lg:w-2/3">
                {/* Rating and Badges */}
                <div className="flex items-center gap-4 mb-6">
                  {movie.imdb_rating && (
                    <div className="flex items-center bg-yellow-600/20 px-3 py-2 rounded-lg">
                      <Star className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" />
                      <span className="text-white text-lg font-bold">{movie.imdb_rating.toFixed(1)}</span>
                      <span className="text-gray-400 ml-1">IMDb</span>
                    </div>
                  )}
                  
                  {movie.is_new && (
                    <Badge className="bg-red-600 text-white px-3 py-1 text-sm">
                      Новинка
                    </Badge>
                  )}
                  
                  {movie.is_exclusive && (
                    <Badge className="bg-yellow-600 text-white px-3 py-1 text-sm">
                      Эксклюзив
                    </Badge>
                  )}
                </div>

                {/* Movie Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <span className="text-sm text-gray-400">Год выпуска:</span>
                        <p className="text-white font-medium">{movie.release_year || 'Не указан'}</p>
                      </div>
                    </div>

                    {priceLabel && (
                      <div className="flex items-center">
                        <ShoppingCart className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <span className="text-sm text-gray-400">Стоимость лицензии:</span>
                          <p className="text-white font-medium">{priceLabel}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <span className="text-sm text-gray-400">Продолжительность:</span>
                        <p className="text-white font-medium">{movie.runtime_min ? `${movie.runtime_min} мин` : 'Не указана'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Globe className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <span className="text-sm text-gray-400">Страна:</span>
                        <p className="text-white font-medium">{movie.country_text || 'Не указана'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Film className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <span className="text-sm text-gray-400">Жанры:</span>
                        <p className="text-white font-medium">
                          {genres.length > 0 ? genres.join(', ') : 'Не указаны'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                                {/* Description Section */}
                {(movie.synopsis || movie.description_full) && (
                  <div className="mb-8" id="movie-description">
                    <h4 className="text-lg font-semibold mb-3 text-white">Описание</h4>
                    <p className="text-gray-300 leading-relaxed">
                      {movie.synopsis || movie.description_full}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Trailer Section */}
            {movie.trailer_url && (
              <div className="mt-10" id="trailer-section">
                <h4 className="text-xl font-semibold mb-6 text-white">Трейлер</h4>
                <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                  <iframe
                    src={convertToEmbedUrl(movie.trailer_url)}
                    title="Трейлер фильма"
                    className="w-full h-full"
                    allowFullScreen
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              </div>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
