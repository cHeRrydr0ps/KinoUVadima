/**
 * Simple REST client for offline movies update/delete
 * Endpoints:
 *   PUT    /api/admin/movies/{id}
 *   DELETE /api/admin/movies/{id}
 */


export async function getOfflineMovieById(movieId: number) {
  const res = await fetch(`/api/admin/movies/${movieId}`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || `Failed to fetch movie ${movieId}`);
  }
  return res.json();
}

export async function updateOfflineMovie(movieId: number, payload: any) {
  const res = await fetch(`/api/admin/movies/${movieId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || `Failed to update movie ${movieId}`);
  }
  return res.json();
}

export async function deleteOfflineMovie(movieId: number) {
  const res = await fetch(`/api/admin/movies/${movieId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || `Failed to delete movie ${movieId}`);
  }
  return true;
}
