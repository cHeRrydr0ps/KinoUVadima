# Admin Service

## Запуск

```bash
docker build -t admin_service .
docker run -p 8002:8000 admin_service
```

## Авторизация в Swagger

1. Нажмите **Authorize**
2. Введите:

```
Bearer admin_token
```

или

```
Bearer moderator_token
```

## New movie/genre schema (2025-08-30)
- Added /admin/movies and /admin/genres endpoints backed by tables movie, genre, movie_genre.
- Included Alembic migration to create new tables and attempt a best-effort data migration from legacy tables films_b2c/genres.
- Legacy /admin/films/b2c endpoints are left in place but marked as legacy in OpenAPI.
