import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";
import { useState } from "react";
import { Star, LogOut } from "lucide-react";

export function Header() {
  const { user, isAuthenticated, logout } = useAuth() as any;
  const [isAuthOpen, setAuthOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-[200] bg-[#0b0b0f] border-b border-cinema-secondary shadow-md">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold hover:opacity-90">
          Кино у Вадима
        </Link>

        <div className="flex items-center gap-3">
          {(user?.role === "administrator" || user?.role === "admin") && isAuthenticated && (
            <Link href="/admin" aria-label="Админ панель" className="flex items-center">
              <Star className="w-5 h-5 text-cinema-red hover:scale-110 transition" />
            </Link>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link href="/profile">
                <Button className="px-3">Профиль</Button>
              </Link>
              <Link href="/my-movies">
                <Button className="px-3">Мои фильмы</Button>
              </Link>
              <button
                aria-label="Выйти"
                className="p-2 rounded-lg hover:bg-zinc-800 transition text-zinc-300"
                onClick={async () => { await logout(); window.location.href = "/"; }}
                title="Выйти"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Button className="px-3" onClick={() => setAuthOpen(true)}>Войти</Button>
          )}
        </div>
      </div>

      <AuthModal isOpen={!isAuthenticated && isAuthOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
