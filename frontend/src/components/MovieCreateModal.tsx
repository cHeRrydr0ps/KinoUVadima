import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMovie, tmdbSearch, TMDBSearchItem } from "@/lib/adminApi";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GenreSelectorDynamic } from "@/components/GenreSelectorDynamic";

type Props = { open: boolean; onOpenChange: (v:boolean)=>void };

export default function MovieCreateModal({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title_local: "", title_original: "", synopsis: "", description_full: "",
    country_text: "", release_year: "", runtime_min: "", age_rating: "",
    imdb_rating: "", expected_gross_rub: "", is_new: false, is_exclusive: false,
    price_rub: "0", discount_rub: "", poster_url: "", trailer_url: "", signed_url: "",
    genre_ids: [] as number[],
  });

  const set = (k: string, v: any) => setForm(s => ({ ...s, [k]: v }));
  const [tmdbQ, setTmdbQ] = useState("");
  const [tmdbResults, setTmdbResults] = useState<TMDBSearchItem[]>([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);

  // naive debounce
  useEffect(() => {
    const q = tmdbQ.trim();
    if (!q) { setTmdbResults([]); return; }
    let cancelled = false;
    setTmdbLoading(true);
    tmdbSearch(q).then(r => { if (!cancelled) setTmdbResults(Array.isArray(r)? r: []); }).catch(()=>{}).finally(()=> setTmdbLoading(false));
    return () => { cancelled = true; };
  }, [tmdbQ]);

  const pickTmdb = (m: TMDBSearchItem) => {
    // map tmdb -> form
    set("title_local", m.title || "");
    set("title_original", m.original_title || "");
    set("release_year", (m.release_date || "").slice(0,4));
    set("synopsis", m.overview || "");
    if (m.poster_path && !form.poster_url) {
      // let admin then replace with CDN link later
      set("poster_url", `https://image.tmdb.org/t/p/w500${m.poster_path}`);
    }
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const payload = {
        title_local: form.title_local.trim(),
        title_original: form.title_original || null,
        synopsis: form.synopsis || null,
        description_full: form.description_full || null,
        country_text: form.country_text || null,
        release_year: form.release_year ? Number(form.release_year) : null,
        runtime_min: form.runtime_min ? Number(form.runtime_min) : null,
        age_rating: form.age_rating || null,
        imdb_rating: form.imdb_rating ? Number(form.imdb_rating) : null,
        expected_gross_rub: form.expected_gross_rub ? Number(form.expected_gross_rub) : null,
        is_new: !!form.is_new,
        is_exclusive: !!form.is_exclusive,
        price_rub: Number(form.price_rub || 0),
        discount_rub: form.discount_rub ? Number(form.discount_rub) : null,
        poster_url: form.poster_url || null,
        trailer_url: form.trailer_url || null,
        signed_url: form.signed_url || null,
        genre_ids: form.genre_ids,
      };
      return createMovie(payload as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin","movies"] });
      onOpenChange(false);
      // reset
      setForm({
        title_local: "", title_original: "", synopsis: "", description_full: "",
        country_text: "", release_year: "", runtime_min: "", age_rating: "",
        imdb_rating: "", expected_gross_rub: "", is_new: false, is_exclusive: false,
        price_rub: "0", discount_rub: "", poster_url: "", trailer_url: "", signed_url: "",
        genre_ids: [],
      });
      setTmdbQ("");
      setTmdbResults([]);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить фильм</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Поиск TMDB</Label>
            <Input placeholder="Начни вводить название…" value={tmdbQ} onChange={e=>setTmdbQ(e.target.value)} />
            {tmdbLoading ? <div className="text-sm text-gray-400 mt-2">Ищем…</div> : null}
            {!!tmdbResults.length && (
              <div className="mt-2 space-y-1 border rounded p-2 bg-black/30">
                {tmdbResults.slice(0,8).map(item => (
                  <button key={item.id} className="w-full text-left hover:bg-white/5 rounded px-2 py-1" onClick={()=>pickTmdb(item)}>
                    <div className="font-medium">{item.title} <span className="text-gray-400">{item.release_date?.slice(0,4) || ""}</span></div>
                    <div className="text-xs text-gray-400 line-clamp-2">{item.overview}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Название (локализ.)</Label>
            <Input value={form.title_local} onChange={e=>set("title_local", e.target.value)} />
          </div>
          <div>
            <Label>Оригинальное название</Label>
            <Input value={form.title_original} onChange={e=>set("title_original", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Краткое описание</Label>
            <Textarea value={form.synopsis} onChange={e=>set("synopsis", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Полное описание</Label>
            <Textarea value={form.description_full} onChange={e=>set("description_full", e.target.value)} />
          </div>

          <div>
            <Label>Страна</Label>
            <Input value={form.country_text} onChange={e=>set("country_text", e.target.value)} />
          </div>
          <div>
            <Label>Год</Label>
            <Input type="number" value={form.release_year} onChange={e=>set("release_year", e.target.value)} />
          </div>
          <div>
            <Label>Длительность (мин)</Label>
            <Input type="number" value={form.runtime_min} onChange={e=>set("runtime_min", e.target.value)} />
          </div>
          <div>
            <Label>Возрастной рейтинг</Label>
            <Input placeholder="16+" value={form.age_rating} onChange={e=>set("age_rating", e.target.value)} />
          </div>

          <div>
            <Label>IMDb</Label>
            <Input type="number" step="0.1" value={form.imdb_rating} onChange={e=>set("imdb_rating", e.target.value)} />
          </div>
          <div>
            <Label>Ожидаемые сборы (₽)</Label>
            <Input type="number" step="0.01" value={form.expected_gross_rub} onChange={e=>set("expected_gross_rub", e.target.value)} />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.is_new} onCheckedChange={v=>set("is_new", v)} />
            <Label>Новинка</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.is_exclusive} onCheckedChange={v=>set("is_exclusive", v)} />
            <Label>Эксклюзив</Label>
          </div>

          <div>
            <Label>Цена (₽)</Label>
            <Input type="number" step="0.01" value={form.price_rub} onChange={e=>set("price_rub", e.target.value)} />
          </div>
          <div>
            <Label>Скидка (₽)</Label>
            <Input type="number" step="0.01" value={form.discount_rub} onChange={e=>set("discount_rub", e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Label>URL постера</Label>
            <Input value={form.poster_url} onChange={e=>set("poster_url", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>URL трейлера</Label>
            <Input value={form.trailer_url} onChange={e=>set("trailer_url", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Подписанная ссылка (скачать)</Label>
            <Input value={form.signed_url} onChange={e=>set("signed_url", e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Label>Жанры</Label>
            <GenreSelectorDynamic value={form.genre_ids} onChange={v=>set("genre_ids", v)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={()=>onOpenChange(false)}>Отмена</Button>
          <Button onClick={()=>createMut.mutate()} disabled={!form.title_local || createMut.isPending}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
