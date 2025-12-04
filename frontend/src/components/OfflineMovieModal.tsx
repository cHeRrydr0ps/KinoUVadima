import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TmdbSearchBox from "@/components/TmdbSearchBox";
import { getGenres, getMovieGenres } from "@/lib/adminApi";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { MovieGenre, OfflineMovie } from "@/types/movies";
import { GenreSelectorDynamic } from "./GenreSelectorDynamic";

const offlineMovieSchema = z.object({
  titleLocalized: z
    .string()
    .min(1, "Локализованное название обязательно"),
  titleOriginal: z.string().optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  genres: z.array(z.number().int()).optional(),
  country: z.string().optional(),
  year: z.preprocess(
    (v: any) =>
      v === "" || v === null || v === undefined ? undefined : Number(v),
    z.number().int().optional()
  ),
  durationMin: z.preprocess(
    (v: any) =>
      v === "" || v === null || v === undefined ? undefined : Number(v),
    z.number().int().optional()
  ),
  ageRating: z.string().optional(),
  ratingImdb: z.preprocess(
    (v: any) =>
      v === "" || v === null || v === undefined ? undefined : Number(v),
    z.number().min(0).max(10).optional()
  ),
  posterUrl: z.string().optional(),
  trailerUrl: z.string().optional(),
  torrentUrl: z.string().optional(),
  price: z.string().optional(),
  boxOfficeExpectationRub: z.preprocess(
    (v: any) =>
      v === "" || v === null || v === undefined ? undefined : Number(v),
    z.number().int().optional()
  ),
  isNew: z.boolean().optional(),
  isExclusive: z.boolean().optional(),
});

type OfflineMovieFormData = z.infer<typeof offlineMovieSchema>;

interface OfflineMovieModalProps {
  movie: OfflineMovie | null;
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
}

export function OfflineMovieModal({
  movie,
  isOpen,
  onClose,
  mode,
}: OfflineMovieModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [hasAutoFilled, setHasAutoFilled] = useState(false);

  const form = useForm<OfflineMovieFormData>({
    resolver: zodResolver(offlineMovieSchema),
    defaultValues: {
      titleLocalized: "",
      titleOriginal: "",
      shortDescription: "",
      description: "",
      genres: [],
      country: "",
      year: new Date().getFullYear(),
      durationMin: 90,
      ageRating: undefined,
      ratingImdb: undefined,
      posterUrl: "",
      trailerUrl: "",
      torrentUrl: "",
      price: "0",
      boxOfficeExpectationRub: undefined,
      isNew: false,
      isExclusive: false,
    },
  });

  const { data: adminGenres = [] } = useQuery({
    queryKey: ["admin", "genres"],
    queryFn: getGenres,
  });

  useQuery({
    queryKey: ["movie", movie?.movieId, "genres"],
    queryFn: () => getMovieGenres(movie?.movieId as number),
    enabled: isOpen && mode === "edit" && !!movie?.movieId,
    onSuccess: (data) => {
      if (mode === "edit" && movie) {
        const genreIds = (data || []).map((g: MovieGenre) => g.genre_id);
        form.setValue("genres", genreIds);
      }
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && movie) {
        const genreIds = movie.genres?.map((g: MovieGenre) => g.genre_id) || [];
        const movieData = movie as any; // backend naming compatibility

        form.reset({
          titleLocalized: movie.titleLocalized || movieData.title_local || "",
          titleOriginal: movie.titleOriginal || movieData.title_original || "",
          shortDescription: movie.shortDescription || movieData.synopsis || "",
          description: movie.description || movieData.description_full || "",
          genres: genreIds,
          country: movie.country || movieData.country_text || "",
          year: movie.year || movieData.release_year || new Date().getFullYear(),
          durationMin: movie.durationMin || movieData.runtime_min || 90,
          ageRating: (movie.ageRating ||
            movieData.age_rating) as OfflineMovieFormData["ageRating"],
          ratingImdb:
            movie.ratingImdb || movieData.imdb_rating
              ? Number(movie.ratingImdb || movieData.imdb_rating)
              : undefined,
          posterUrl: movie.posterUrl || movieData.poster_url || "",
          trailerUrl: movie.trailerUrl || movieData.trailer_url || "",
          torrentUrl: movie.torrentUrl || movieData.torrent_url || "",
          price: String(movie.price || movieData.price_rub || 0),
          boxOfficeExpectationRub:
            movie.boxOfficeExpectationRub || movieData.expected_gross_rub || undefined,
          isNew: movie.isNew || movieData.is_new || false,
          isExclusive: movie.isExclusive || movieData.is_exclusive || false,
        });
      } else if (!hasAutoFilled) {
        form.reset({
          titleLocalized: "",
          titleOriginal: "",
          shortDescription: "",
          description: "",
          genres: [],
          country: "",
          year: new Date().getFullYear(),
          durationMin: 90,
          ageRating: undefined,
          ratingImdb: undefined,
          posterUrl: "",
          trailerUrl: "",
          torrentUrl: "",
          price: "0",
          boxOfficeExpectationRub: undefined,
          isNew: false,
          isExclusive: false,
        });
      }
    } else {
      setHasAutoFilled(false);
    }
  }, [isOpen, movie, mode, form, hasAutoFilled]);

  const mutation = useMutation({
    mutationFn: async (data: OfflineMovieFormData) => {
      setIsLoading(true);

      const priceStr = String(data.price || "0").replace(/[^\d.]/g, "");
      const priceNum = Number(priceStr || "0").toFixed(2);

      const payload = {
        title_local: data.titleLocalized,
        title_original: data.titleOriginal || "",
        synopsis: data.shortDescription || "",
        description_full: data.description || "",
        country_text: data.country || "",
        release_year: data.year || undefined,
        runtime_min: data.durationMin || undefined,
        age_rating: data.ageRating || "",
        poster_url: data.posterUrl || "",
        trailer_url: data.trailerUrl || "",
        torrent_url: data.torrentUrl || "",
        imdb_rating: typeof data.ratingImdb === "number" ? data.ratingImdb : undefined,
        price_rub: Number(priceNum),
        expected_gross_rub: data.boxOfficeExpectationRub || undefined,
        is_new: !!data.isNew,
        is_exclusive: !!data.isExclusive,
        genre_ids: (data.genres || []) as number[],
      };

      if (mode === "edit" && movie) {
        return await apiRequest("PUT", `/api/admin/movies/${movie.movieId}`, payload);
      }
      return await apiRequest("POST", "/api/admin/movies/", payload);
    },
    onSuccess: () => {
      setIsLoading(false);
      toast({
        title: "Успех",
        description: `Фильм ${mode === "edit" ? "обновлен" : "создан"} успешно`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "movies"] });
      onClose();
    },
    onError: (error: any) => {
      setIsLoading(false);
      toast({
        title: "Ошибка",
        description:
          error?.details?.[0]?.message ||
          `Не удалось ${mode === "edit" ? "обновить" : "создать"} фильм`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OfflineMovieFormData) => {
    mutation.mutate(data);
  };

  const handleTmdbPick = (d: any) => {
    const names = (d.genres || [])
      .map((g: any) => (g.name || "").trim().toLowerCase());
    const mapped = (adminGenres || [])
      .filter((g: any) => names.includes((g.name || "").trim().toLowerCase()))
      .map((g: any) => g.genre_id);

    try {
      form.setValue("titleLocalized", d.title || d.original_title || "", {
        shouldDirty: true,
        shouldTouch: true,
      });
    } catch {}
    try {
      form.setValue("titleOriginal", d.original_title || "", {
        shouldDirty: true,
        shouldTouch: true,
      });
    } catch {}
    try {
      form.setValue("shortDescription", d.overview || "", {
        shouldDirty: true,
        shouldTouch: true,
      });
    } catch {}
    try {
      form.setValue("description", d.overview || "", {
        shouldDirty: true,
        shouldTouch: true,
      });
    } catch {}
    try {
      const y = Number(d.release_year);
      if (!Number.isNaN(y)) {
        form.setValue("year", y, { shouldDirty: true, shouldTouch: true });
      }
    } catch {}
    try {
      if (typeof d.runtime === "number") {
        form.setValue("durationMin", d.runtime, {
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    } catch {}
    try {
      if (typeof d.vote_average === "number") {
        form.setValue("ratingImdb", Math.round(d.vote_average * 10) / 10, {
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    } catch {}
    try {
      form.setValue("posterUrl", d.poster_url ?? "", {
        shouldDirty: true,
        shouldTouch: true,
      });
    } catch {}
    try {
      form.setValue("trailerUrl", d.trailer_url ?? "", {
        shouldDirty: true,
        shouldTouch: true,
      });
    } catch {}
    try {
      form.setValue("country", (d.countries || "").trim(), {
        shouldDirty: true,
        shouldTouch: true,
      });
    } catch {}
    try {
      if (mapped.length) {
        form.setValue("genres", mapped, { shouldDirty: true, shouldTouch: true });
      }
    } catch {}

    form.trigger();
    setHasAutoFilled(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="bg-cinema-gray border-gray-600 max-w-4xl max-h-[90vh] overflow-y-auto modal-scroll">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit"
              ? "Редактировать оффлайн фильм (B2B)"
              : "Создать оффлайн фильм (B2B)"}
          </DialogTitle>
          <DialogDescription>
            Заполните информацию о фильме для B2B каталога
          </DialogDescription>
        </DialogHeader>

        <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-600 mb-6">
          <h3 className="text-white font-semibold mb-3">Поиск в TMDb</h3>
          <TmdbSearchBox onPick={handleTmdbPick} />
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600">
            <h3 className="text-lg font-semibold text-white mb-4">
              Основная информация
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titleLocalized">Локализованное название *</Label>
                <Input id="titleLocalized" {...form.register("titleLocalized")} />
                {form.formState.errors.titleLocalized && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.titleLocalized.message as any}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="titleOriginal">Оригинальное название</Label>
                <Input id="titleOriginal" {...form.register("titleOriginal")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="shortDescription">Краткое описание (синопсис)</Label>
                <Textarea id="shortDescription" {...form.register("shortDescription")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Полное описание</Label>
                <Textarea id="description" {...form.register("description")} />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600">
            <h3 className="text-lg font-semibold text-white mb-4">Жанры и детали</h3>

            <div className="space-y-2">
              <Label>Жанры</Label>
              <GenreSelectorDynamic
                genres={adminGenres}
                selected={form.watch("genres") || []}
                onChange={(ids) => form.setValue("genres", ids)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="country">Страна происхождения</Label>
                <Input id="country" {...form.register("country")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Год релиза</Label>
                <Input
                  id="year"
                  type="number"
                  {...form.register("year", {
                    valueAsNumber: true,
                    setValueAs: (value) =>
                      value === "" ? undefined : Number(value),
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="durationMin">Продолжительность (мин.)</Label>
                <Input
                  id="durationMin"
                  type="number"
                  {...form.register("durationMin", {
                    valueAsNumber: true,
                    setValueAs: (value) =>
                      value === "" ? undefined : Number(value),
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ageRating">Возрастной рейтинг</Label>
                <Input
                  id="ageRating"
                  placeholder="например, 12+"
                  {...form.register("ageRating")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="ratingImdb">Рейтинг IMDB</Label>
                <Input
                  id="ratingImdb"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  {...form.register("ratingImdb", {
                    valueAsNumber: true,
                    setValueAs: (value) =>
                      value === "" ? undefined : Number(value),
                  })}
                />
                {form.formState.errors.ratingImdb && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.ratingImdb.message as any}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600">
            <h3 className="text-lg font-semibold text-white mb-4">Медиа</h3>

            <div className="space-y-6">
              <div>
                <Label htmlFor="posterUrl">Обложка (URL)</Label>
                <Input
                  id="posterUrl"
                  placeholder="https://example.com/poster.jpg"
                  {...form.register("posterUrl")}
                />
              </div>

              <div>
                <Label htmlFor="trailerUrl">Ссылка на трейлер</Label>
                <Input
                  id="trailerUrl"
                  placeholder="https://example.com/trailer.mp4"
                  {...form.register("trailerUrl")}
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600">
            <h3 className="text-lg font-semibold text-white mb-4">
              Специфично для B2B
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="torrentUrl">Ссылка на торрент</Label>
                <Input id="torrentUrl" type="url" {...form.register("torrentUrl")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="boxOfficeExpectationRub">
                  Ожидаемые сборы (₽)
                </Label>
                <Input
                  id="boxOfficeExpectationRub"
                  type="number"
                  {...form.register("boxOfficeExpectationRub", {
                    valueAsNumber: true,
                    setValueAs: (value) =>
                      value === "" ? undefined : Number(value),
                  })}
                />
                {form.formState.errors.boxOfficeExpectationRub && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.boxOfficeExpectationRub.message as any}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="price">Цена</Label>
              <Input id="price" {...form.register("price")} />
            </div>
          </div>

          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600">
            <h3 className="text-lg font-semibold text-white mb-4">Статусы</h3>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isNew"
                  checked={form.watch("isNew")}
                  onCheckedChange={(checked) =>
                    form.setValue("isNew", checked as boolean)
                  }
                />
                <Label htmlFor="isNew" className="text-white">
                  Новинка
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isExclusive"
                  checked={form.watch("isExclusive")}
                  onCheckedChange={(checked) =>
                    form.setValue("isExclusive", checked as boolean)
                  }
                />
                <Label htmlFor="isExclusive" className="text-white">
                  Эксклюзив
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Сохранение..."
                : mode === "edit"
                ? "Обновить"
                : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
