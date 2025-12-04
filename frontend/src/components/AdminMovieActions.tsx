import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { deleteOfflineMovie } from "@/api/moviesApi";
import { useToast } from "@/hooks/use-toast";
import { memo } from "react";

type MovieLike = {
  movie_id: number;
  title_local?: string;
  titleLocalized?: string;
  title?: string;
};

interface AdminMovieActionsProps {
  movie: MovieLike;
  onEdit: (movie: MovieLike) => void;
}

export const AdminMovieActions = memo(function AdminMovieActions({ movie, onEdit }: AdminMovieActionsProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const delMut = useMutation({
    mutationFn: (id: number) => deleteOfflineMovie(id),
    onSuccess: async () => {
      // invalidate common lists used in AdminPanel
      await Promise.allSettled([
        qc.invalidateQueries({ queryKey: ["/api/offline-movies"] }),
        qc.invalidateQueries({ queryKey: ["/api/admin/movies/"] }),
        qc.invalidateQueries({ queryKey: ["admin", "movies"] }),
      ]);
      toast({ title: "Фильм удалён" });
    },
    onError: (err: any) => {
      toast({ title: "Не удалось удалить фильм", description: String(err?.message || err), variant: "destructive" });
    },
  });

  const title = movie.title_local || movie.titleLocalized || movie.title || `#${movie.movie_id}`;

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => onEdit(movie)}
      >
        Ред.
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => {
          if (delMut.isLoading) return;
          if (confirm(`Удалить фильм "${title}"?`)) {
            delMut.mutate(movie.movie_id);
          }
        }}
        disabled={delMut.isLoading}
      >
        {delMut.isLoading ? "Удаляю..." : "Удалить"}
      </Button>
    </div>
  );
});
