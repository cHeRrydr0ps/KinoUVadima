import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";
import { Film } from "lucide-react";

export default function Landing() {
  const { isAuthenticated } = useAuth() as any;
  const [, setLocation] = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/films");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen text-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-cinema-gradient pointer-events-none" />

        <div className="relative z-10 container mx-auto px-4 py-16">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <Film className="w-8 h-8 text-cinema-red" />
              <span className="uppercase tracking-widest text-cinema-red">B2B Платформа</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
              Кино у Вадима —{" "}
              <span className="text-cinema-red">легальная дистрибуция</span> оффлайн-фильмов
            </h1>
            <p className="text-gray-300 mt-6 text-lg">
              Приобретайте права на показ фильмов для площадок и прокатчиков.
              Профессиональные инструменты и прозрачные условия.
            </p>

            <div className="mt-10">
              <Button
                className="bg-cinema-red hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold"
                data-testid="get-started-button"
                onClick={() => setIsAuthModalOpen(true)}
              >
                Войти / Зарегистрироваться
              </Button>
            </div>
          </div>
        </div>
      </section>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
