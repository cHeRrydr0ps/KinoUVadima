// minimal helper to normalize /api/users response
export async function fetchUsersSafe(): Promise<any[]> {
  const res = await fetch("/api/users");
  if (!res.ok) return [];
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as any)?.items)) return (data as any).items;
  return [];
}
