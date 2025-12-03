
// src/components/TmdbSearchBox.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tmdbSearch, tmdbMovie, TmdbShort, TmdbDetails } from '@/api/tmdbApi';

export default function TmdbSearchBox({ onPick }: { onPick: (d: TmdbDetails & TmdbShort) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const { data: results = [], refetch, isFetching } = useQuery({
    queryKey: ['tmdb', 'search', q],
    queryFn: () => tmdbSearch(q),
    enabled: false,
  });

  const pick = async (item: TmdbShort) => {
    const details = await tmdbMovie(item.id);
    onPick({ ...details, ...item });
    setOpen(false);
  };

  return (
    <div className="rounded-xl border border-neutral-700 p-3">
      <div className="text-sm font-semibold mb-2">Поиск в TMDb</div>
      <div className="flex gap-2 items-center relative">
        <input
          className="flex-1 rounded-md bg-neutral-900 px-3 py-2"
          placeholder="Введите название фильма для поиска в TMDb..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q && setOpen(true)}
        />
        <button
          className="rounded-md px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm"
          onClick={async () => {
            if (!q.trim()) return;
            await refetch();
            setOpen(true);
          }}
          disabled={isFetching || !q.trim()}
        >
          {isFetching ? 'Ищем...' : 'Поиск'}
        </button>
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 mt-2 w-full max-h-64 overflow-auto rounded-md bg-neutral-900 border border-neutral-700 z-20">
            {results.map((r) => (
              <button
                key={r.id}
                className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-sm"
                onClick={() => pick(r)}
              >
                {r.title} {r.release_year ? `(${r.release_year})` : ''}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
