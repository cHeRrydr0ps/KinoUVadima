import { useMemo, useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Plus, Search, Film, Tag, TrendingUp, Star, Shield, Ban, Trash2, Save } from "lucide-react";

import type { OfflineMovie, OnlineMovie } from "@/types/schema";

import { OfflineMovieModal } from "@/components/OfflineMovieModal";
import { TrailerModal } from "@/components/TrailerModal";
import UserModeration from "@/components/UserModeration";
import PurchaseModeration from "@/components/admin/PurchaseModeration";
import { useToast } from "@/hooks/use-toast";

import MovieCreateModal from "@/components/MovieCreateModal";

import { listGenres, listMovies, getMovieDetails } from "@/lib/adminApi";

import { getOfflineMovieById } from "@/api/moviesApi";

import { apiRequest } from "@/lib/queryClient";

import { isUnauthorizedError } from "@/lib/authUtils";

import { Badge } from "@/components/ui/badge";

import { GenresBlock } from "@/components/admin/GenresBlock";



type UserType = {

  id: string | number;

  email: string;

  name?: string;

  role: "user" | "moderator" | "administrator" | string;

  isBanned?: boolean;

  createdAt?: string;

};



export default function AdminPanel() {

  const { toast } = useToast();

  const qc = useQueryClient();

  const genresQ = useQuery({ queryKey: ["admin","genres"], queryFn: () => listGenres(), retry: 0 });

  const moviesQ = useQuery({ queryKey: ["admin","movies"], queryFn: () => listMovies({ limit: 50 }), retry: 0 });

  const genresArr = Array.isArray(genresQ.data) ? genresQ.data : [];

  const moviesArr = Array.isArray(moviesQ.data) ? moviesQ.data : [];

  const [createOpen, setCreateOpen] = useState(false);



  const [activeTab, setActiveTab] = useState<"overview" | "offline" | "moderation" | "purchases">("overview");
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [modalMovie, setModalMovie] = useState<OfflineMovie | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);

  const [isEditLoading, setIsEditLoading] = useState(false);



// Ensure full movie detail is fetched before opening edit modal

const loadAndOpenEdit = async (id: number | string) => {

    const movieId = typeof id === 'string' ? parseInt(id) : id;

    setIsEditLoading(true);

    try {

      const movieData = await getMovieDetails(movieId);

      

      const transformedMovie = {

          id: movieData.movie_id,

          movieId: movieData.movie_id,

          titleLocalized: movieData.title_local || movieData.title_ru || '',

          titleOriginal: movieData.title_original || '',

          description: movieData.description_full || movieData.description || '',

          shortDescription: movieData.synopsis || '',

          genres: movieData.genres || [],

          genreIds: movieData.genres?.map(g => g.genre_id) || [],

          country: movieData.country_text || movieData.country || '',

          year: movieData.release_year || movieData.year,

          durationMin: movieData.runtime_min || movieData.duration,

          ageRating: movieData.age_rating || '',

          ratingImdb: typeof movieData.imdb_rating === 'string' ? parseFloat(movieData.imdb_rating) : movieData.imdb_rating,

          posterUrl: movieData.poster_url || movieData.posterUrl || '',

          trailerUrl: movieData.trailer_url || movieData.trailerUrl || movieData.trailer || '',

          torrentUrl: movieData.torrent_url || movieData.torrentUrl || '',

          price: String(movieData.price_rub || '0'),

          boxOfficeExpectationRub: typeof movieData.expected_gross_rub === 'string' ? 

            parseFloat(movieData.expected_gross_rub) : movieData.expected_gross_rub,

          isNew: !!movieData.is_new,

          isExclusive: !!movieData.is_exclusive,

          isNewRelease: !!movieData.is_new_release

      };

      setModalMovie(transformedMovie);

      setModalMode("edit");

      setIsModalOpen(true);

    } catch (error) {

      toast({

        title: "Ошибка загрузки данных фильма",

        description: String(error),

        variant: "destructive",

      });

    } finally {

      setIsEditLoading(false);

    }

  };



  // Users

  const { data: users = [], isLoading: usersLoading } = useQuery<UserType[]>({

    queryKey: ["/api/users"],

    retry: false,

    queryFn: async () => {

      const res = await fetch("/api/users");

      if (!res.ok) throw new Error(await res.text());

      return res.json();

    },

    meta: {

      onError: (error: Error) => {

        if (isUnauthorizedError(error)) {

          toast({ title: "Сессия истекла", description: "Войдите заново", variant: "destructive" });

          setTimeout(() => (window.location.href = "/api/login"), 400);

        }

      },

    },

  });



  // Stats

  const stats = useMemo(() => {

    const total = moviesArr.length;

    const promo = moviesArr.filter((m: any) => m.isOnPromotion).length;

    const newRel = moviesArr.filter((m: any) => m.isNewRelease).length;

    const avg = (() => {

      const withRating = moviesArr.map((m: any) => Number(m.rating)).filter((n) => !isNaN(n));

      return withRating.length ? (withRating.reduce((a, b) => a + b, 0) / withRating.length).toFixed(2) : "—";

    })();

    return { total, promo, newRel, avg };

  }, [moviesArr]);







  /* === Users management === */

  const [userFilter, setUserFilter] = useState<"" | "user" | "moderator" | "administrator">("");

  const [userSearch, setUserSearch] = useState("");



  const filteredUsers = useMemo(() => {

    let arr = users;

    if (userFilter) arr = arr.filter((u) => String(u.role) === userFilter);

    const q = userSearch.trim().toLowerCase();

    if (q) arr = arr.filter((u) => (u.email || "").toLowerCase().includes(q) || (u.name || "").toLowerCase().includes(q));

    return arr;

  }, [users, userFilter, userSearch]);



  const changeRole = useMutation({

    mutationFn: async ({ id, role }: { id: string | number; role: string }) => {

      // пробуем специальную ручку /role, иначе общий PUT

      let res = await apiRequest("PUT", `/api/users/${id}/role`, { role });

      if (!res.ok) {

        res = await apiRequest("PUT", `/api/users/${id}`, { role });

      }

      if (!res.ok) throw new Error(await res.text());

    },

    onSuccess: async () => {

      await qc.invalidateQueries({ queryKey: ["/api/users"] });

      toast({ title: " оль обновлена" });

    },

    onError: (err: any) => toast({ title: "Не удалось обновить роль", description: String(err?.message || err), variant: "destructive" }),

  });



  const toggleBan = useMutation({

    mutationFn: async ({ id, to }: { id: string | number; to: boolean }) => {

      let res = await apiRequest("POST", `/api/users/${id}/ban`, { isBanned: to });

      if (!res.ok) {

        res = await apiRequest("PUT", `/api/users/${id}`, { isBanned: to });

      }

      if (!res.ok) throw new Error(await res.text());

    },

    onSuccess: async () => {

      await qc.invalidateQueries({ queryKey: ["/api/users"] });

      toast({ title: "Статус обновлён" });

    },

    onError: (err: any) => toast({ title: "Не удалось обновить статус", description: String(err?.message || err), variant: "destructive" }),

  });



  const deleteUser = useMutation({

    mutationFn: async (id: string | number) => {

      const res = await apiRequest("DELETE", `/api/users/${id}`);

      if (!res.ok) throw new Error(await res.text());

    },

    onSuccess: async () => {

      await qc.invalidateQueries({ queryKey: ["/api/users"] });

      toast({ title: "Пользователь удалён" });

    },

    onError: (err: any) => toast({ title: "Не удалось удалить", description: String(err?.message || err), variant: "destructive" }),

  });



  // === B2B: удалить фильм ===

  const deleteAdminMovie = useMutation({

    mutationFn: async (id: number) => {

      const res = await apiRequest("DELETE", `/api/admin/movies/${id}`);

      if (!res.ok) throw new Error(await res.text());

    },

    onSuccess: async () => {

      await qc.invalidateQueries({ queryKey: ["admin","movies"] });

      toast({ title: "Фильм удалён" });

    },

    onError: (err: any) =>

      toast({

        title: "Не удалось удалить фильм",

        description: String(err?.message || err),

        variant: "destructive",

      }),

  });



  return (

    <div className="min-h-screen px-4 py-8 container mx-auto text-white">

      <h1 className="text-3xl font-bold mb-6">Админ-панель</h1>



      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">

        <TabsList className="grid w-full grid-cols-4 bg-cinema-gray">
          <TabsTrigger value="overview" data-testid="tab-overview">Обзор</TabsTrigger>
          <TabsTrigger value="offline" data-testid="tab-offline">Оффлайн кино</TabsTrigger>
          <TabsTrigger value="moderation" data-testid="tab-moderation">Модерация</TabsTrigger>
          <TabsTrigger value="purchases" data-testid="tab-purchases">Покупки</TabsTrigger>
        </TabsList>


        {/* === OVERVIEW === */}

        <TabsContent value="overview" className="space-y-8">

          {/* KPI */}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            <Card className="cinema-card"><CardContent className="p-6 flex items-center gap-4">

              <div className="w-10 h-10 rounded-md bg-blue-600 flex items-center justify-center"><Film className="w-5 h-5 text-white" /></div>

              <div><div className="text-2xl font-bold">{stats.total}</div><div className="text-sm text-gray-400">Оффлайн-фильмов</div></div>

            </CardContent></Card>

            <Card className="cinema-card"><CardContent className="p-6 flex items-center gap-4">

              <div className="w-10 h-10 rounded-md bg-orange-600 flex items-center justify-center"><Tag className="w-5 h-5 text-white" /></div>

              <div><div className="text-2xl font-bold">{stats.promo}</div><div className="text-sm text-gray-400">На промо</div></div>

            </CardContent></Card>

            <Card className="cinema-card"><CardContent className="p-6 flex items-center gap-4">

              <div className="w-10 h-10 rounded-md bg-green-600 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-white" /></div>

              <div><div className="text-2xl font-bold">{stats.newRel}</div><div className="text-sm text-gray-400">Новые релизы</div></div>

            </CardContent></Card>

            <Card className="cinema-card"><CardContent className="p-6 flex items-center gap-4">

              <div className="w-10 h-10 rounded-md bg-purple-600 flex items-center justify-center"><Star className="w-5 h-5 text-white" /></div>

              <div><div className="text-2xl font-bold">{String(stats.avg)}</div><div className="text-sm text-gray-400">Средний рейтинг</div></div>

            </CardContent></Card>

          </div>



          {/* Users management */}

          <div className="space-y-4">

            <div className="flex items-center justify-between">

              <h2 className="text-xl font-semibold">Управление пользователями</h2>

              <Badge className="bg-gray-700">{users.length} пользователей</Badge>

            </div>



            <div className="flex items-center gap-3">

              <div className="relative flex-1">

                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                <Input

                  placeholder="Поиск по имени или email..."

                  className="pl-9 bg-cinema-gray border-gray-700 text-white"

                  value={userSearch}

                  onChange={(e) => setUserSearch(e.target.value)}

                />

              </div>

              <select

                className="bg-cinema-gray border border-gray-700 rounded px-3 py-2"

                value={userFilter}

                onChange={(e) => setUserFilter(e.target.value as any)}

              >

                <option value="">Все роли</option>

                <option value="user">Пользователь</option>

                <option value="moderator">Модератор</option>

                <option value="administrator">Администратор</option>

              </select>

            </div>



            <div className="grid gap-3 max-h-[28rem] overflow-y-auto pr-1">

              {usersLoading ? (

                <div className="text-gray-400">Загрузка пользователей...</div>

              ) : filteredUsers.length === 0 ? (

                <div className="text-gray-400">Пользователи не найдены</div>

              ) : (

                filteredUsers.map((u) => (

                  <Card key={u.id} className="cinema-card">

                    <CardContent className="p-4 flex items-center justify-between gap-4">

                      <div className="min-w-0">

                        <div className="font-medium truncate">{u.name || "Без имени"}</div>

                        <div className="text-sm text-gray-400 truncate">{u.email}</div>

                        <div className="text-xs text-gray-500 mt-1 truncate">ID: {String(u.id)} {u.createdAt ? `• ${new Date(u.createdAt).toLocaleDateString("ru-RU")}` : ""}</div>

                      </div>



                      <div className="flex items-center gap-2">

                        <Badge className={u.role === "administrator" ? "bg-red-600" : u.role === "moderator" ? "bg-yellow-600" : "bg-blue-600"}>

                          {u.role === "administrator" ? "Администратор" : u.role === "moderator" ? "Модератор" : "Пользователь"}

                        </Badge>



                        <select

                          defaultValue={u.role}

                          onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value })}

                          className="bg-cinema-gray border border-gray-700 rounded px-2 py-1 text-sm"

                          aria-label="Назначить роль"

                        >

                          <option value="user">Пользователь</option>

                          <option value="moderator">Модератор</option>

                          <option value="administrator">Администратор</option>

                        </select>



                        <Button

                          size="sm"

                          variant={u.isBanned ? "secondary" : "destructive"}

                          onClick={() => toggleBan.mutate({ id: u.id, to: !u.isBanned })}

                          title={u.isBanned ? " азблокировать" : "Заблокировать"}

                        >

                          <Ban className="w-4 h-4" />

                        </Button>



                        <Button

                          size="sm"

                          variant="destructive"

                          onClick={() => {

                            if (confirm("Удалить пользователя?")) deleteUser.mutate(u.id);

                          }}

                          title="Удалить пользователя"

                        >

                          <Trash2 className="w-4 h-4" />

                        </Button>

                      </div>

                    </CardContent>

                  </Card>

                ))

              )}

            </div>

          </div>

        </TabsContent>



        {/* === OFFLINE === */}

        <TabsContent value="offline">

          <div className="flex flex-col gap-4">

            <div className="flex items-center gap-3">

              <div className="relative flex-1">

                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                <Input

                  placeholder="Поиск по названию..."

                  className="pl-9 bg-cinema-gray border-gray-700 text:white"

                  value={search}

                  onChange={(e) => setSearch(e.target.value)}

                />

              </div>

              <Button

                onClick={() => { setModalMovie(null); setModalMode("create"); setIsModalOpen(true); }}

                className="bg-cinema-red hover:bg-red-700"

                data-testid="btn-add-offline"

              >

                <Plus className="w-4 h-4 mr-2" /> Добавить фильм

              </Button>

            </div>



            {/* Upper movie grid removed */}

          </div>



          <OfflineMovieModal movie={modalMovie} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} mode={modalMode} />

          <TrailerModal 

            url={trailerUrl || ""} 

            isOpen={!!trailerUrl} 

            onClose={() => {

              setTrailerUrl(null);



            }} 

            movieTitle={modalMovie?.titleLocalized || modalMovie?.titleOriginal || ""} 

          />



          {/* === Каталог фильмов (B2B) === */}

          <div className="mt-8 space-y-4">

            <div className="flex items-center justify-between">

              <div className="text-lg font-semibold">Каталог фильмов (B2B)</div>

              <div className="flex items:center gap-2">



                <Button size="sm" variant="outline" onClick={() => qc.invalidateQueries?.({ queryKey: ["admin","movies"] })}>

                  Обновить список

                </Button>



              </div>

            </div>



            <Card>

              <CardContent className="p-4">

                <div className="font-semibold mb-2">Жанры</div>

                {genresQ?.isLoading ? <div>Загрузка…</div> : null}

                {genresArr.length ? (

                  <div className="flex flex-wrap gap-2">

                    {genresArr.map(g => (

                      <span key={g.genre_id} className="px-2 py-1 bg-cinema-gray rounded text-sm">{g.name}</span>

                    ))}

                  </div>

                ) : <div className="text-gray-400">Нет жанров</div>}

              </CardContent>

            </Card>



            <Card>

              <CardContent className="p-4">

                <div className="font-semibold mb-2">Фильмы</div>

                {moviesQ?.isLoading ? <div>Загрузка…</div> : null}

                <div className="space-y-2">

                  {moviesArr.map(m => (

                    <div key={m.movie_id} className="bg-cinema-gray rounded p-3 flex items-center justify-between">

                      <div className="min-w-0">

                        <div className="font-medium truncate">{m.title_local}{m.release_year ? ` · ${m.release_year}` : ""}</div>

                        <div className="text-xs text-gray-400 truncate">

                          {m.is_new && "Новинка · "}{m.is_exclusive && "Эксклюзив · "}

                          IMDb: {m.imdb_rating ?? "—"} · Цена: {m.price_rub} ₽

                        </div>

                      </div>

                      <div className="flex items-center gap-2">

                        <Button

                          size="sm"

                          variant="outline"

                          onClick={() => {



                            loadAndOpenEdit(m.movie_id);

                          }}

                        >

                           ед.

                        </Button>

                        <Button

                          size="sm"

                          variant="destructive"

                          onClick={() => {

                            if (confirm(`Удалить фильм "${m.title_local || "без названия"}"?`)) {

                              deleteAdminMovie.mutate(m.movie_id);

                            }

                          }}

                        >

                          Удалить

                        </Button>

                      </div>

                    </div>

                  ))}

                  {!moviesQ?.isLoading && moviesArr.length === 0 && (

                    <div className="text-gray-400">Пусто. Добавь первый фильм.</div>

                  )}

                </div>

              </CardContent>

            </Card>

          </div>



          <MovieCreateModal open={createOpen} onOpenChange={setCreateOpen} />



        </TabsContent>



        {/* === MODERATION === */}

        <TabsContent value="moderation">
          <UserModeration />
        </TabsContent>

        <TabsContent value="purchases">
          <PurchaseModeration />
        </TabsContent>
      </Tabs>

    </div>

  );

}

