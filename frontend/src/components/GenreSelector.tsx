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
  "Аниме",
  "Биография",
  "Боевик",
  "Вестерн",
  "Военный",
  "Детектив",
  "Детский",
  "Для взрослых",
  "Документальный",
  "Драма",
  "Игра",
  "История",
  "Комедия",
  "Концерт",
  "Короткометражка",
  "Криминал",
  "Мелодрама",
  "Музыка",
  "Мультфильм",
  "Мюзикл",
  "Новости",
  "Приключения",
  "Реальное ТВ",
  "Семейный",
  "Спорт",
  "Ток-шоу",
  "Триллер",
  "Ужасы",
  "Фантастика",
  "Фильм-нуар",
  "Фэнтези",
  "Церемония",
];

interface GenreSelectorProps {
  selectedGenres: string[];
  onGenresChange: (genres: string[]) => void;
  error?: string;
}

export function GenreSelector({
  selectedGenres,
  onGenresChange,
  error,
}: GenreSelectorProps) {
  const [selectValue, setSelectValue] = useState<string>("");

  const handleAddGenre = (genre: string) => {
    if (genre && !selectedGenres.includes(genre)) {
      onGenresChange([...selectedGenres, genre]);
    }
    setSelectValue("");
  };

  const handleRemoveGenre = (genreToRemove: string) => {
    onGenresChange(selectedGenres.filter((genre) => genre !== genreToRemove));
  };

  const availableOptions = AVAILABLE_GENRES.filter(
    (genre) => !selectedGenres.includes(genre)
  );

  return (
    <div className="space-y-3">
      <Select value={selectValue} onValueChange={handleAddGenre}>
        <SelectTrigger
          className="bg-gray-800 border-gray-600 text-white"
          data-testid="select-genres"
        >
          <SelectValue placeholder="Выберите жанр" />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600">
          {availableOptions.map((genre) => (
            <SelectItem
              key={genre}
              value={genre}
              className="text-white hover:bg-gray-700"
            >
              {genre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedGenres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedGenres.map((genre) => (
            <span
              key={genre}
              className="flex items-center gap-1 rounded-full bg-gray-700 px-3 py-1 text-sm text-white"
            >
              {genre}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-gray-300 hover:text-white"
                onClick={() => handleRemoveGenre(genre)}
              >
                <X className="h-4 w-4" />
              </Button>
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
