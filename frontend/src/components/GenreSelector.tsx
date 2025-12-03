import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AVAILABLE_GENRES = [
  "Драма",
  "Комедия", 
  "Триллер",
  "Боевик",
  "Фантастика",
  "Ужасы",
  "Романтика",
  "Приключения",
  "Криминал",
  "Детектив",
  "Военный",
  "Историческая драма",
  "Документальный",
  "Биография",
  "Спорт",
  "Музыкальный",
  "Вестерн",
  "Семейный",
  "Мультфильм",
  "Фэнтези"
];

interface GenreSelectorProps {
  selectedGenres: string[];
  onGenresChange: (genres: string[]) => void;
  error?: string;
}

export function GenreSelector({ selectedGenres, onGenresChange, error }: GenreSelectorProps) {
  const [selectValue, setSelectValue] = useState<string>("");

  const handleAddGenre = (genre: string) => {
    if (genre && !selectedGenres.includes(genre)) {
      onGenresChange([...selectedGenres, genre]);
    }
    setSelectValue("");
  };

  const handleRemoveGenre = (genreToRemove: string) => {
    onGenresChange(selectedGenres.filter(genre => genre !== genreToRemove));
  };

  const availableOptions = AVAILABLE_GENRES.filter(
    genre => !selectedGenres.includes(genre)
  );

  return (
    <div className="space-y-3">
      
      {/* Genre Selection Dropdown */}
      <Select value={selectValue} onValueChange={handleAddGenre}>
        <SelectTrigger 
          className="bg-gray-800 border-gray-600 text-white" 
          data-testid="select-genres"
        >
          <SelectValue placeholder="Выберите жанр для добавления" />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600">
          {availableOptions.map((genre) => (
            <SelectItem key={genre} value={genre} className="text-white hover:bg-gray-700">
              {genre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Selected Genres Tags */}
      {selectedGenres.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-800 border border-gray-600 rounded-md">
          {selectedGenres.map((genre) => (
            <div
              key={genre}
              className="flex items-center gap-1 px-3 py-1 bg-cinema-red text-white text-sm rounded-full"
              data-testid={`genre-tag-${genre.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <span>{genre}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-red-600 rounded-full"
                onClick={() => handleRemoveGenre(genre)}
                data-testid={`remove-genre-${genre.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Help Text */}
      <p className="text-gray-400 text-xs">
        Выберите жанры из списка. Для удаления нажмите на крестик рядом с жанром.
      </p>
    </div>
  );
}