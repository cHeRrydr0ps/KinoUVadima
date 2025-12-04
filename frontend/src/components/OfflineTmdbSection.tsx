// Reusable TMDb search section for embedding into the offline movie modal.
// Provides autocomplete and auto-fill of form fields via callbacks.
import React, { useState } from "react";
import TmdbSearchBox from "@/components/TmdbSearchBox";

type AdminGenre = { genre_id: number; name: string };

export type OfflineMovieFormPatch = Partial<{
  title_local: string;
  title_original?: string;
  synopsis?: string;
  description_full?: string;
  genre_ids: number[];
  country_text?: string;
  release_year?: number;
  runtime_min?: number;
  imdb_rating?: number;
  poster_url?: string | null;
  trailer_url?: string | null;
}>;

export default function OfflineTmdbSection({
  adminGenres,
  value,
  onChange,
}: {
  adminGenres: AdminGenre[];
  value?: any; // current form value (used only for merge)
  onChange: (patch: OfflineMovieFormPatch) => void;
}) {
  const [open, setOpen] = useState(true); // toggle visibility if needed

  return (
    <div className="rounded-xl border border-neutral-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Поиск по TMDb</div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-neutral-400 hover:text-neutral-200"
        >
          {open ? "Свернуть" : "Развернуть"}
        </button>
      </div>

      {open && (
        <TmdbSearchBox
          onPick={(d) => {
            // Маппинг жанров TMDb → id наших жанров по имени (без регистра)
            const names = (d.genres || []).map((g) =>
              (g.name || "").trim().toLowerCase()
            );
            const mappedIds: number[] = [];
            for (const g of adminGenres || []) {
              if (names.includes((g.name || "").trim().toLowerCase())) {
                mappedIds.push(g.genre_id);
              }
            }

            onChange({
              title_local: d.title || value?.title_local,
              title_original: d.original_title ?? value?.title_original,
              synopsis: d.overview ?? value?.synopsis,
              description_full: d.overview ?? value?.description_full,
              country_text: d.countries ?? value?.country_text,
              release_year: d.release_year ? Number(d.release_year) : value?.release_year,
              runtime_min:
                typeof d.runtime === "number" ? d.runtime : value?.runtime_min,
              imdb_rating:
                typeof d.vote_average === "number"
                  ? Math.round(d.vote_average * 10) / 10
                  : value?.imdb_rating,
              poster_url: d.poster_url ?? value?.poster_url,
              trailer_url: d.trailer_url ?? value?.trailer_url,
              genre_ids: mappedIds.length ? mappedIds : value?.genre_ids,
            });
          }}
        />
      )}
    </div>
  );
}
