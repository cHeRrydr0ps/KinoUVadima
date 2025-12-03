// src/components/admin/GenresBlock.tsx
import { useQuery } from "@tanstack/react-query";
import { getGenres } from "@/lib/adminApi";

export default function GenresBlock() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["adminGenres"],
    queryFn: getGenres,
  });

  if (isLoading) return <div className="text-gray-400">Загрузка...</div>;
  if (isError) return <div className="text-gray-400">Не удалось загрузить жанры</div>;
  if (!data || data.length === 0) return <div className="text-gray-400">Нет жанров</div>;

  return <div className="text-gray-400">{data.map((g) => g.name).join(", ")}</div>;
}
