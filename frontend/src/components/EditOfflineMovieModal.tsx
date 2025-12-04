
import { useQuery } from "@tanstack/react-query";
import { OfflineMovieModal } from "@/components/OfflineMovieModal";
import { getOfflineMovieById } from "@/api/moviesApi";
import { getGenres } from "@/api/adminApi";

type Props = {
  movieId: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

// Local normalizer (subset): rely mostly on OfflineMovieModal's internal normalize
function passThroughNormalize(input: any) {
  if (!input) return null;
  const id = input.movie_id ?? input.id ?? input.movieId;
  return {
    ...input,
    id,
    movieId: id,
  };
}

export default function EditOfflineMovieModal({ movieId, open, onOpenChange }: Props) {
  // Preload genres so OfflineMovieModal can map names -> ids
  useQuery({ queryKey: ["admin","genres"], queryFn: getGenres, enabled: open });

  const detailsQ = useQuery({
    enabled: open && !!movieId,
    queryKey: ["admin","offline-movie-details", movieId],
    queryFn: () => getOfflineMovieById(Number(movieId)),
    retry: 1,
  });

  const normalized = passThroughNormalize(detailsQ.data);

  return (
    <OfflineMovieModal
      key={open && movieId ? `edit-${movieId}` : "edit-empty"}
      movie={normalized as any}
      isOpen={open}
      onClose={() => onOpenChange(false)}
      mode="edit"
    />
  );
}
