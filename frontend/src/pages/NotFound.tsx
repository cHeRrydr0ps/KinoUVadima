import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cinema-gradient text-zinc-200 flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-semibold mb-4">Страница не найдена</h1>
      <p className="text-zinc-400 max-w-md">
        Кажется, вы перешли по неверной ссылке или страница была перемещена. Вернитесь на главную или воспользуйтесь меню навигации.
      </p>
      <Link href="/" className="mt-6 inline-flex items-center px-4 py-2 rounded bg-cinema-red hover:bg-red-700 transition-colors">
        На главную
      </Link>
    </div>
  );
}
