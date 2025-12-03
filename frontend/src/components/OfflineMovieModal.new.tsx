import { useState, useEffect } from "react";

import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { z } from "zod";

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/lib/queryClient";

import { getOfflineMovieById } from "@/api/moviesApi";

import {

  Dialog,

  DialogContent,

  DialogHeader,

  DialogTitle,

  DialogDescription,

} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import TmdbSearchBox from "@/components/TmdbSearchBox";

import { getGenres, getMovieGenres } from "@/lib/adminApi";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";

import { Checkbox } from "@/components/ui/checkbox";

import { useToast } from "@/hooks/use-toast";

import { OfflineMovie } from "@shared/schema";

import { GenreSelectorDynamic } from "./GenreSelectorDynamic";

import { FileUpload } from "@/components/FileUpload";



const offlineMovieSchema = z.object({

  titleLocalized: z.string().min(1, "Р›окализованное название РѕР±СЏР·Р°С‚ельно"),

  titleOriginal: z.string().optional(),

  shortDescription: z.string().optional(),

  description: z.string().optional(),

  genres: z.array(z.number().int()).optional(),

  country: z.string().optional(),

  year: z.preprocess((v:any)=> (v===''||v===null||v===undefined?undefined:Number(v)), z.number().int().optional()),

  durationMin: z.preprocess((v:any)=> (v===''||v===null||v===undefined?undefined:Number(v)), z.number().int().optional()),

  ageRating: z.string().optional(),

  ratingImdb: z.preprocess((v:any)=> (v===''||v===null||v===undefined?undefined:Number(v)), z.number().min(0).max(10).optional()),

  posterUrl: z.string().optional(),

  trailerUrl: z.string().optional(),

  torrentUrl: z.string().optional(),

  price: z.string().optional(),

  boxOfficeExpectationRub: z.preprocess((v:any)=> (v===''||v===null||v===undefined?undefined:Number(v)), z.number().int().optional()),

  isNew: z.boolean().optional(),

  isExclusive: z.boolean().optional(),

});



type OfflineMovieFormData = z.infer<typeof offlineMovieSchema>;



interface OfflineMovieModalProps {

  movie: OfflineMovie | null;

  isOpen: boolean;

  onClose: () => void;

  mode: 'create' | 'edit';

}



export function OfflineMovieModal({ movie, isOpen, onClose, mode }: OfflineMovieModalProps) {

  const { toast } = useToast();

  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);



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



  const { data: adminGenres = [] } = useQuery({ queryKey: ["admin","genres"], queryFn: getGenres });

  

  const { data: movieGenres = [] } = useQuery({

    queryKey: ['movie', movie?.movieId, 'genres'],

    queryFn: () => getMovieGenres(movie?.movieId as number),

    enabled: isOpen && mode === 'edit' && !!movie?.movieId

  });



  useEffect(() => {

    if (isOpen) {

      if (mode === 'edit' && movie) {

        const genreIds = movie.genres?.map(g => g.genre_id) || [];

        

        const formData = {

          titleLocalized: movie.titleLocalized || "",

          titleOriginal: movie.titleOriginal || "",

          shortDescription: movie.shortDescription || "",

          description: movie.description || "",

          genres: genreIds,

          country: movie.country || "",

          year: movie.year || new Date().getFullYear(),

          durationMin: movie.durationMin || 90,

          ageRating: movie.ageRating as any || undefined,

          ratingImdb: movie.ratingImdb ? Number(movie.ratingImdb) : undefined,

          posterUrl: movie.posterUrl || "",

          trailerUrl: movie.trailerUrl || "",

          torrentUrl: movie.torrentUrl || "",

          price: String(movie.price || 0),

          boxOfficeExpectationRub: movie.boxOfficeExpectationRub || undefined,

          isNew: movie.isNew || false,

          isExclusive: movie.isExclusive || false,

        };

        form.reset(formData);

      } else {

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

    }

  }, [isOpen, movie, mode, form, movieGenres]);



  const mutation = useMutation({

    mutationFn: async (data: OfflineMovieFormData) => {

      setIsLoading(true);

      

      // Преобразование С†РµРЅС‹: СѓРґаляем все РЅРµС‡РёСЃР»РѕРІС‹е СЃРёРјРІРѕР»С‹, кроме С‚РѕС‡ки,

      // и С„РѕСЂРјР°С‚ируем Рґо 2 знаков после Р·Р°РїСЏС‚РѕР№

      const priceStr = String(data.price || '0').replace(/[^\d.]/g, '');

      const priceNum = Number(priceStr || '0').toFixed(2);



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

        imdb_rating: typeof data.ratingImdb === 'number' ? data.ratingImdb : undefined,

        price_rub: Number(priceNum),

        expected_gross_rub: data.boxOfficeExpectationRub || undefined,

        is_new: !!data.isNew,

        is_exclusive: !!data.isExclusive,

        genre_ids: (data.genres || []) as number[],

      };



      if (mode === 'edit' && movie) {

        return await apiRequest('PUT', `/api/admin/movies/${movie.movieId}`, payload);

      } else {

        return await apiRequest('POST', '/api/admin/movies/', payload);

      }

    },

    onSuccess: () => {

      setIsLoading(false);

      toast({

        title: "РЈСЃРїРµС…",

        description: `Фильм ${mode === 'edit' ? 'обновлен' : 'СЃРѕР·Рґан'} СѓСЃРїРµС€но`,

      });

      queryClient.invalidateQueries({ queryKey: ['/api/admin/movies/'] });

      onClose();

    },

    onError: (error: any) => {

      setIsLoading(false);



      toast({

        title: "РћС€ибка",

        description: error?.details?.[0]?.message || `Не СѓРґалось ${mode === 'edit' ? 'РѕР±РЅРѕРІРёС‚ь' : 'СЃРѕР·РґР°С‚ь'} С„ильм`,

        variant: "destructive",

      });

    },

  });



  const onSubmit = (data: OfflineMovieFormData) => {

    mutation.mutate(data);

  };



  return (

    <Dialog open={isOpen} onOpenChange={(open)=>{ if (!open) onClose(); }}>

      <DialogContent className="bg-cinema-gray border-gray-600 max-w-4xl max-h-[90vh] overflow-y-auto modal-scroll">

        <DialogHeader>

          <DialogTitle>

            {mode === 'edit' ? 'Р РµРґР°РєС‚РёСЂРѕРІР°С‚ь' : 'РЎРѕР·РґР°С‚ь'} РѕС„С„Р»Р°Р№н С„ильм (B2B)

          </DialogTitle>

          <DialogDescription>

            Р—Р°РїРѕР»РЅРёС‚е РёРЅС„РѕСЂРјР°С†ию о С„ильме Рґля B2B РєР°С‚алога

          </DialogDescription>

        </DialogHeader>



        <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-600 mb-6">

          <h3 className="text-white font-semibold mb-3">Поиск в TMDb</h3>

          <TmdbSearchBox

            onPick={(d) => {

              const names = (d.genres || []).map((g) => (g.name || "").trim().toLowerCase());

              const mapped = (adminGenres || [])

                .filter((g) => names.includes((g.name || "").trim().toLowerCase()))

                .map((g) => g.genre_id);



              try { form.setValue("titleLocalized", d.title || d.original_title || ""); } catch {}

              try { form.setValue("titleOriginal", d.original_title || ""); } catch {}

              try { form.setValue("shortDescription", d.overview || ""); } catch {}

              try { form.setValue("description", d.overview || ""); } catch {}

              try {

                const y = Number(d.release_year);

                if (!Number.isNaN(y)) form.setValue("year", y);

              } catch {}

              try { if (typeof d.runtime === "number") form.setValue("durationMin", d.runtime); } catch {}

              try { if (typeof d.vote_average === "number") form.setValue("ratingImdb", Math.round(d.vote_average * 10) / 10); } catch {}

              try { form.setValue("posterUrl", d.poster_url ?? ""); } catch {}

              try { form.setValue("trailerUrl", d.trailer_url ?? ""); } catch {}

              try { form.setValue("country", (d.countries || "").trim()); } catch {}

              try { if (mapped.length) form.setValue("genres", mapped); } catch {}

            }}

          />

        </div>



        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600">

            <h3 className="text-lg font-semibold text-white mb-4">Основная РёРЅС„РѕСЂРјР°С†ия</h3>

            

            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-2">

                <Label htmlFor="titleLocalized">Р›окализованное название *</Label>

                <Input

                  id="titleLocalized"

                  {...form.register("titleLocalized")}

                />

                {form.formState.errors.titleLocalized && (

                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.titleLocalized.message as any}</p>

                )}

              </div>

              

              <div className="space-y-2">

                <Label htmlFor="titleOriginal">Оригинальное название</Label>

                <Input

                  id="titleOriginal"

                  {...form.register("titleOriginal")}

                />

              </div>

            </div>



            <div className="space-y-2">

              <Label htmlFor="shortDescription">РљСЂР°С‚кое описание (синопсис)</Label>

              <Textarea

                id="shortDescription"

                rows={2}

                {...form.register("shortDescription")}

              />

            </div>



            <div className="space-y-2">

              <Label htmlFor="description">Полное описание</Label>

              <Textarea

                id="description"

                rows={4}

                {...form.register("description")}

              />

            </div>



            <div className="space-y-2">

              <Label>Р–Р°РЅСЂС‹</Label>

              <GenreSelectorDynamic

                value={form.watch("genres") || []}

                onChange={(genres) => form.setValue("genres", genres)}

              />

            </div>



            <div className="grid grid-cols-3 gap-4">

              <div className="space-y-2">

                <Label htmlFor="country">РЎС‚рана РїСЂРѕРёР·РІРѕРґСЃС‚ва</Label>

                <Input

                  id="country"

                  {...form.register("country")}

                />

              </div>

              

              <div className="space-y-2">

                <Label htmlFor="year">Р“РѕРґ релиза</Label>

                <Input

                  id="year"

                  type="number"

                  {...form.register("year", { valueAsNumber: true })}

                />

              </div>

              

              <div className="space-y-2">

                <Label htmlFor="durationMin">РџСЂРѕРґРѕР»Р¶РёС‚РµР»СЊРЅРѕСЃС‚ь (мин.)</Label>

                <Input

                  id="durationMin"

                  type="number"

                  {...form.register("durationMin", { valueAsNumber: true })}

                />

              </div>

            </div>



            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-2">

                <Label htmlFor="ageRating">Р’РѕР·СЂР°СЃС‚РЅРѕР№ СЂРµР№С‚инг</Label>

                <Input

                  id="ageRating"

                  placeholder="например, 12+"

                  {...form.register("ageRating")}

                />

              </div>

              

              <div className="space-y-2">

                <Label htmlFor="ratingImdb">Р РµР№С‚инг IMDB</Label>

                <Input

                  id="ratingImdb"

                  type="number"

                  step="0.1"

                  min="0"

                  max="10"

                  {...form.register("ratingImdb", {

                    valueAsNumber: true,

                    setValueAs: (value) => value === "" ? undefined : Number(value)

                  })}

                />

                {form.formState.errors.ratingImdb && (

                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.ratingImdb.message as any}</p>

                )}

              </div>

            </div>

          </div>



          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600">

            <h3 className="text-lg font-semibold text-white mb-4">РњРµРґиа</h3>

            

            <div className="space-y-6">

              <FileUpload

                label="Обложка (РїРѕСЃС‚ер)"

                accept="image/*"

                currentValue={form.watch("posterUrl")}

                onChange={(value) => form.setValue("posterUrl", value)}

                uploadType="poster"

                placeholder="https://example.com/poster.jpg"

              />

              

              <FileUpload

                label="РўСЂРµР№лер С„ильма"

                accept="video/*"

                currentValue={form.watch("trailerUrl")}

                onChange={(value) => form.setValue("trailerUrl", value)}

                uploadType="trailer"

                placeholder="https://example.com/trailer.mp4"

              />

            </div>

          </div>



          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600">

            <h3 className="text-lg font-semibold text-white mb-4">РЎРїРµС†РёС„РёС‡но Рґля B2B</h3>

            

            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-2">

                <Label htmlFor="torrentUrl">РЎСЃС‹лка на С‚РѕСЂСЂРµРЅС‚</Label>

                <Input

                  id="torrentUrl"

                  type="url"

                  {...form.register("torrentUrl")}

                />

              </div>

              

              <div className="space-y-2">

                <Label htmlFor="boxOfficeExpectationRub">РћР¶РёРґР°РµРјС‹е СЃР±РѕСЂС‹ (в‚Ѕ)</Label>

                <Input

                  id="boxOfficeExpectationRub"

                  type="number"

                  {...form.register("boxOfficeExpectationRub", {

                    valueAsNumber: true,

                    setValueAs: (value) => value === "" ? undefined : Number(value)

                  })}

                />

                {form.formState.errors.boxOfficeExpectationRub && (

                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.boxOfficeExpectationRub.message as any}</p>

                )}

              </div>

            </div>



            <div className="space-y-2">

              <Label htmlFor="price">Цена</Label>

              <Input

                id="price"

                {...form.register("price")}

              />

            </div>

          </div>



          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600">

            <h3 className="text-lg font-semibold text-white mb-4">РЎС‚Р°С‚СѓСЃС‹</h3>

            

            <div className="flex gap-6">

              <div className="flex items-center space-x-2">

                <Checkbox

                  id="isNew"

                  checked={form.watch("isNew")}

                  onCheckedChange={(checked) => form.setValue("isNew", checked as boolean)}

                />

                <Label htmlFor="isNew" className="text-white">Новинка</Label>

              </div>



              <div className="flex items-center space-x-2">

                <Checkbox

                  id="isExclusive"

                  checked={form.watch("isExclusive")}

                  onCheckedChange={(checked) => form.setValue("isExclusive", checked as boolean)}

                />

                <Label htmlFor="isExclusive" className="text-white">Эксклюзив</Label>

              </div>

            </div>

          </div>



          <div className="flex justify-end space-x-2 pt-4">

            <Button

              type="button"

              variant="outline"

              onClick={onClose}

            >

              РћС‚мена

            </Button>

            <Button

              type="submit"

              disabled={isLoading}

            >

              {isLoading ? 'РЎРѕС…ранение...' : (mode === 'edit' ? 'РћР±РЅРѕРІРёС‚ь' : 'РЎРѕР·РґР°С‚ь')}

            </Button>

          </div>

        </form>

      </DialogContent>

    </Dialog>

  );

}

