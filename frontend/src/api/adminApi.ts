export type AdminGenre = { genre_id: number; name: string; name_ru?: string };

export type User = {
  id: number;
  inn?: string;
  name: string;
  email: string;
  role?: string;
  is_blocked: boolean;
  is_verified: boolean;
};

export type UserListResponse = {
  users: User[];
  total: number;
};

// Auth token management
function getAuthToken(): string | null {
  // Читаем токен из кук
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'access_token') {
      return value;
    }
  }
  return null;
}

function getAuthHeaders() {
  const token = getAuthToken();
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

export async function getGenres(): Promise<AdminGenre[]> {
  const res = await fetch('/api/admin/genres/', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load genres');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getMovieById(id: number) {
  const res = await fetch(`/api/admin/movies/${id}`, {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error('Failed to load movie');
  return res.json();
}

export async function getMovieGenres(movieId: number): Promise<number[]> {
  const res = await fetch(`/api/admin/movies/${movieId}/genres`, {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error('Failed to load movie genres');
  const data = await res.json();
  return Array.isArray(data) ? data.map(g => g.genre_id) : [];
}

// Movies API for edit/delete
export async function updateMovie(movieId: number, payload: any) {
  const res = await fetch(`/api/admin/movies/${movieId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteMovie(movieId: number) {
  const res = await fetch(`/api/admin/movies/${movieId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await res.text());
  return true;
}

// User moderation API
export async function getAllUsers(skip = 0, limit = 100): Promise<UserListResponse> {
  const res = await fetch(`/api/auth/admin/users?skip=${skip}&limit=${limit}`, {
    credentials: 'include',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to load users');
  return res.json();
}

export async function getPendingUsers(): Promise<User[]> {
  const res = await fetch('/api/auth/admin/users/pending', {
    credentials: 'include',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to load pending users');
  return res.json();
}

export async function approveUser(userId: number) {
  const res = await fetch(`/api/auth/admin/users/${userId}/approve`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to approve user');
  return res.json();
}

export async function rejectUser(userId: number, reason = 'Не указана') {
  const res = await fetch(`/api/auth/admin/users/${userId}/reject?reason=${encodeURIComponent(reason)}`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to reject user');
  return res.json();
}

export async function getUserById(userId: number): Promise<User> {
  const res = await fetch(`/api/auth/admin/users/${userId}`, {
    credentials: 'include',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to load user');
  return res.json();
}
