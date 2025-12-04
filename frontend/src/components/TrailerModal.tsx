import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Play } from "lucide-react";

// Функция для конвертации URL в embed формат
function convertToEmbedUrl(url?: string): string {
  if (!url) return '';
  
  // YouTube URLs
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  // Vimeo URLs
  if (url.includes('vimeo.com/')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    return `https://player.vimeo.com/video/${videoId}`;
  }
  
  // Rutube URLs
  if (url.includes('rutube.ru/video/')) {
    const videoId = url.split('/video/')[1]?.split('/')[0];
    return `https://rutube.ru/play/embed/${videoId}`;
  }
  
  // VK Video URLs
  if (url.includes('vk.com/video')) {
    return url.replace('vk.com/video', 'vk.com/video_ext.php');
  }
  
  // Если URL уже в формате embed или неизвестный хостинг - возвращаем как есть
  return url;
}

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieTitle?: string;
  url: string;
}

export function TrailerModal({ isOpen, onClose, movieTitle = "", url }: TrailerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-cinema-gray border-gray-600 max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold text-white">
            {movieTitle ? `Трейлер: ${movieTitle}` : 'Трейлер'}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-8 h-8 bg-gray-600 hover:bg-gray-500 rounded-full"
            data-testid="trailer-modal-close"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>
        
        <div className="p-6 pt-4">
          <div className="aspect-video bg-cinema-dark rounded-lg overflow-hidden">
            {url ? (
              <iframe
                src={convertToEmbedUrl(url)}
                title={`Трейлер ${movieTitle}`}
                className="w-full h-full"
                allowFullScreen
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center">
                    <Play className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-gray-400 text-lg">Трейлер недоступен</p>
                  <p className="text-gray-500 text-sm mt-2">Видео не найдено или не загружено</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}