import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MovieCard } from "@/components/MovieCard";
import { MovieModal } from "@/components/MovieModal";
import { getMovies, getGenres, getMovieById, type Movie, type Genre, type MoviesResponse } from "@/api/contentApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Функция для склонения фразы с количеством фильмов
const getMoviesPhrase = (count: number): string => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `Найдено ${count} фильмов`;
  }
  
  if (lastDigit === 1) {
    return `Найден ${count} фильм`;
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return `Найдено ${count} фильма`;
  }
  
  return `Найдено ${count} фильмов`;
};

export default function Films() {
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Filter states
  const [search, setSearch] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<string>('release_year');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [currentPage, setCurrentPage] = useState(0);
  
  // Additional filters
  const [minYear, setMinYear] = useState<string>("");
  const [maxYear, setMaxYear] = useState<string>("");
  const [minRating, setMinRating] = useState<string>("none");
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [showExclusiveOnly, setShowExclusiveOnly] = useState(false);
  
  const limit = 20;

  // Fetch genres
  const { data: genres = [] } = useQuery<Genre[]>({
    queryKey: ["content", "genres"],
    queryFn: getGenres
  });

  // Fetch selected movie details
  const { data: selectedMovie, isLoading: isMovieLoading } = useQuery<Movie>({
    queryKey: ["content", "movie", selectedMovieId],
    queryFn: () => getMovieById(selectedMovieId!),
    enabled: !!selectedMovieId
  });

  // Fetch movies with current filters
  const { data: moviesData, isLoading } = useQuery<MoviesResponse>({
    queryKey: ["content", "movies", {
      search,
      selectedGenres,
      sortBy,
      sortOrder,
      currentPage,
      limit,
      minYear,
      maxYear,
      minRating,
      showNewOnly,
      showExclusiveOnly
    }],
    queryFn: () => getMovies({
      search: search || undefined,
      genre_id: selectedGenres.length > 0 ? selectedGenres[0] : undefined, // TODO: Update API for multiple genres
      limit,
      offset: currentPage * limit,
      sort_by: sortBy,
      sort_order: sortOrder
    })
  });

  const movies = moviesData?.movies || [];
  const total = moviesData?.total || 0;
  const hasNext = moviesData?.has_next || false;

  // Filter movies on frontend for additional filters (temporary until API supports them)
  const filteredMovies = movies.filter(movie => {
    // Year filter
    if (minYear && movie.release_year && movie.release_year < parseInt(minYear)) return false;
    if (maxYear && movie.release_year && movie.release_year > parseInt(maxYear)) return false;
    
    // Rating filter
    if (minRating && minRating !== "none" && movie.imdb_rating && movie.imdb_rating < parseFloat(minRating)) return false;
    
    // New movies only
    if (showNewOnly && !movie.is_new) return false;
    
    // Exclusive movies only
    if (showExclusiveOnly && !movie.is_exclusive) return false;
    
    // Multiple genres filter
    if (selectedGenres.length > 1) {
      const movieGenreIds = movie.genres?.map(g => g.genre_id) || [];
      const hasAllGenres = selectedGenres.every(genreId => movieGenreIds.includes(genreId));
      if (!hasAllGenres) return false;
    }
    
    return true;
  });

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovieId(movie.movie_id);
    setModalOpen(true);
  };

  const handleGenreChange = (genreId: number, checked: boolean) => {
    if (checked) {
      setSelectedGenres(prev => [...prev, genreId]);
    } else {
      setSelectedGenres(prev => prev.filter(id => id !== genreId));
    }
    setCurrentPage(0);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(0);
  };

  const handleSortChange = (field: string, order: string) => {
    setSortBy(field);
    setSortOrder(order);
    setCurrentPage(0);
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedGenres([]);
    setSortBy('release_year');
    setSortOrder('desc');
    setCurrentPage(0);
    setMinYear("");
    setMaxYear("");
    setMinRating("none");
    setShowNewOnly(false);
    setShowExclusiveOnly(false);
  };

  const nextPage = () => {
    if (hasNext) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const MovieGridSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="bg-cinema-gray rounded-lg overflow-hidden">
          <Skeleton className="aspect-[2/3] bg-gray-700" />
          <div className="p-3">
            <Skeleton className="h-4 mb-2 bg-gray-700" />
            <Skeleton className="h-3 mb-1 bg-gray-700" />
            <Skeleton className="h-3 bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-white">Каталог фильмов</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Откройте для себя большую коллекцию фильмов различных жанров. Найдите что-то на свой вкус!
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <div className="cinema-card rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Фильтры
                </h3>
                {(selectedGenres.length > 0 || minYear || maxYear || (minRating && minRating !== "none") || showNewOnly || showExclusiveOnly) && (
                  <span className="text-xs bg-cinema-red text-white px-2 py-1 rounded-full">
                    {selectedGenres.length + (minYear ? 1 : 0) + (maxYear ? 1 : 0) + (minRating && minRating !== "none" ? 1 : 0) + (showNewOnly ? 1 : 0) + (showExclusiveOnly ? 1 : 0)}
                  </span>
                )}
              </div>
              
              <div className="space-y-6">
                {/* Genre filter */}
                <div>
                  <Label className="block text-sm font-medium mb-3 text-white">
                    Жанры {selectedGenres.length > 0 && (
                      <span className="text-cinema-red">({selectedGenres.length})</span>
                    )}
                  </Label>
                  <div className="space-y-3">
                    {genres.map((genre) => (
                      <div key={genre.genre_id} className="flex items-center space-x-3">
                        <Checkbox
                          id={`filter-${genre.genre_id}`}
                          checked={selectedGenres.includes(genre.genre_id)}
                          onCheckedChange={(checked) => 
                            handleGenreChange(genre.genre_id, checked as boolean)
                          }
                          className="data-[state=checked]:bg-cinema-red data-[state=checked]:border-cinema-red"
                        />
                        <Label 
                          htmlFor={`filter-${genre.genre_id}`} 
                          className="text-sm text-white cursor-pointer hover:text-cinema-red transition-colors capitalize"
                        >
                          {genre.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Year filter */}
                <div>
                  <Label className="block text-sm font-medium mb-3 text-white">Год выпуска</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-400 mb-1 block">От</Label>
                      <Input
                        type="number"
                        placeholder="1990"
                        value={minYear}
                        onChange={(e) => setMinYear(e.target.value)}
                        className="cinema-card border-cinema-secondary text-white text-sm h-8"
                        min="1900"
                        max="2030"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400 mb-1 block">До</Label>
                      <Input
                        type="number"
                        placeholder="2025"
                        value={maxYear}
                        onChange={(e) => setMaxYear(e.target.value)}
                        className="cinema-card border-cinema-secondary text-white text-sm h-8"
                        min="1900"
                        max="2030"
                      />
                    </div>
                  </div>
                </div>

                {/* Rating filter */}
                <div>
                  <Label className="block text-sm font-medium mb-3 text-white">Минимальный рейтинг IMDb</Label>
                  <Select value={minRating} onValueChange={setMinRating}>
                    <SelectTrigger className="cinema-card border-cinema-secondary text-white">
                      <SelectValue placeholder="Любой рейтинг" />
                    </SelectTrigger>
                    <SelectContent className="cinema-card border-cinema-secondary">
                      <SelectItem value="none">Любой рейтинг</SelectItem>
                      <SelectItem value="9.0">9.0+</SelectItem>
                      <SelectItem value="8.0">8.0+</SelectItem>
                      <SelectItem value="7.0">7.0+</SelectItem>
                      <SelectItem value="6.0">6.0+</SelectItem>
                      <SelectItem value="5.0">5.0+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Special filters */}
                <div>
                  <Label className="block text-sm font-medium mb-3 text-white">Особые категории</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="filter-new"
                        checked={showNewOnly}
                        onCheckedChange={(checked) => setShowNewOnly(checked as boolean)}
                        className="data-[state=checked]:bg-cinema-red data-[state=checked]:border-cinema-red"
                      />
                      <Label 
                        htmlFor="filter-new" 
                        className="text-sm text-white cursor-pointer hover:text-cinema-red transition-colors"
                      >
                        🆕 Только новинки
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="filter-exclusive"
                        checked={showExclusiveOnly}
                        onCheckedChange={(checked) => setShowExclusiveOnly(checked as boolean)}
                        className="data-[state=checked]:bg-cinema-red data-[state=checked]:border-cinema-red"
                      />
                      <Label 
                        htmlFor="filter-exclusive" 
                        className="text-sm text-white cursor-pointer hover:text-cinema-red transition-colors"
                      >
                        ⭐ Только эксклюзивы
                      </Label>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={resetFilters}
                  className="w-full bg-cinema-red hover:bg-red-700 text-white"
                >
                  <X className="w-4 h-4 mr-2" />
                  Сбросить фильтры
                </Button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:w-3/4">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Поиск фильмов..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full cinema-card border-cinema-secondary text-white placeholder-gray-400 pr-10"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>

            {/* Sorting and Results */}
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-400">
                {getMoviesPhrase(moviesData?.total || 0)}
              </span>
              <div className="flex space-x-2">
                <Select 
                  value={`${sortBy}-${sortOrder}`} 
                  onValueChange={(value) => {
                    const [field, order] = value.split('-');
                    handleSortChange(field, order);
                  }}
                >
                  <SelectTrigger className="w-48 cinema-card border-cinema-secondary text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="cinema-card border-cinema-secondary">
                    <SelectItem value="release_year-desc">Сначала новые</SelectItem>
                    <SelectItem value="release_year-asc">Сначала старые</SelectItem>
                    <SelectItem value="title_local-asc">По алфавиту А-Я</SelectItem>
                    <SelectItem value="title_local-desc">По алфавиту Я-А</SelectItem>
                    <SelectItem value="imdb_rating-desc">По рейтингу (высокий)</SelectItem>
                    <SelectItem value="imdb_rating-asc">По рейтингу (низкий)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Movies Grid */}
            {isLoading ? (
              <MovieGridSkeleton />
            ) : filteredMovies.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-2">
                {filteredMovies.map((movie) => (
                  <div key={movie.movie_id} className="p-1">
                    <MovieCard
                      movie={movie}
                      onClick={() => handleMovieClick(movie)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">Фильмы не найдены</p>
                <p className="text-gray-500 mt-2">Попробуйте изменить параметры поиска или фильтры</p>
              </div>
            )}

            {/* Pagination */}
            {total > limit && (
              <div className="flex justify-center items-center mt-8 space-x-4">
                <Button
                  variant="ghost"
                  disabled={currentPage === 0}
                  onClick={prevPage}
                  className="flex items-center cinema-card hover:bg-cinema-red text-white disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Предыдущая
                </Button>
                
                <span className="text-white px-4">
                  Страница {currentPage + 1} из {Math.ceil(total / limit)}
                </span>
                
                <Button
                  variant="ghost"
                  disabled={!hasNext}
                  onClick={nextPage}
                  className="flex items-center cinema-card hover:bg-cinema-red text-white disabled:opacity-50"
                >
                  Следующая
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <MovieModal
        movie={selectedMovie || null}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedMovieId(null);
        }}
        isLoading={isMovieLoading}
      />
    </div>
  );
}
