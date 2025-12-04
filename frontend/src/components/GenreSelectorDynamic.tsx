import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGenres } from '../api/adminApi';

type Props = {
  value?: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
};

export default function GenreSelectorDynamic({ value = [], onChange, placeholder = "Выберите жанр для добавления" }: Props) {
  const { data: genres = [], isLoading, isError } = useQuery({ queryKey: ["admin","genres"], queryFn: getGenres });

  const toggle = (id: number) => {
    if (!onChange) return;
    if (value.includes(id)) onChange(value.filter(x => x !== id));
    else onChange([...value, id]);
  };

  if (isLoading) return <div className="text-sm text-gray-400">Загрузка жанров…</div>;
  if (isError) return <div className="text-sm text-red-400">Не удалось загрузить жанры</div>;

  return (
    <div className="space-y-2">
      <div className="max-h-56 overflow-auto rounded-md border border-gray-600/60 p-2 bg-gray-900/40">
        {genres.map(g => (
          <label key={g.genre_id} className="flex items-center gap-2 py-1 px-1 hover:bg-gray-800/40 rounded">
            <input
              type="checkbox"
              checked={value.includes(g.genre_id)}
              onChange={() => toggle(g.genre_id)}
              className="accent-white"
            />
            <span>{g.name}</span>
          </label>
        ))}
        {!genres.length && <div className="text-sm text-gray-400">{placeholder}</div>}
      </div>

      {!!value.length && (
        <div className="flex flex-wrap gap-2">
          {value.map(id => {
            const g = genres.find(x => x.genre_id === id);
            if (!g) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className="px-2 py-1 text-xs rounded-md bg-neutral-800 hover:bg-neutral-700"
                title="Удалить"
              >
                {g.name} ×
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { GenreSelectorDynamic };
