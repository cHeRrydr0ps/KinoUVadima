import { QueryClient, QueryFunction, QueryFunctionContext } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text().catch(() => "")) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function assertNoLegacy(url: string) {
  if (url.startsWith("/api/auth/user")) {
    console.error('[apiRequest] Deprecated URL "/api/auth/user" used. Switch to "/api/auth/me".');
  }
}

export async function apiRequest(method: string, url: string, data?: unknown): Promise<Response> {
  assertNoLegacy(url);
  const token = localStorage.getItem("authToken");
  const headers: Record<string, string> = {};
  if (data !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return fetch(url, {
    method,
    headers,
    credentials: "include",
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(opts: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  <T>({ on401 }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem("authToken");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const rawUrl = (queryKey.join("/") as string) || "/";
    assertNoLegacy(rawUrl);

    const res = await fetch(rawUrl, { headers, credentials: "include" });
    if (on401 === "returnNull" && res.status === 401) {
      return null as unknown as T;
    }
    await throwIfResNotOk(res);
    return (await res.json()) as T;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60 * 60 * 1000,
      retry: (failureCount, error: any) => {
        if (error instanceof TypeError && String(error.message || "").includes("Failed to fetch")) return false;
        if (error instanceof Error && /^\d{3}:/.test(error.message)) return false;
        return failureCount < 1;
      },
    },
    mutations: { retry: false },
  },
});
