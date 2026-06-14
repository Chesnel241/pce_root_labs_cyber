/**
 * Client API léger.
 *
 * Le frontend fonctionne en autonomie avec les données de démo (lib/demo.ts).
 * Dès que le backend tourne, définissez NEXT_PUBLIC_API_URL et ces helpers
 * deviennent la source de vérité. Les formes de réponse suivent le contrat
 * défini côté backend (voir backend/README.md).
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "pce.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  register: (data: { email: string; username: string; password: string }) =>
    request<{ token: string; user: unknown }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: unknown }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: () => request<unknown>("/auth/me"),
  tracks: () => request<{ tracks: unknown[] }>("/tracks"),
  submitFlag: (challengeId: string, flag: string) =>
    request<{ correct: boolean; awardedPoints: number; totalXp: number }>(
      `/challenges/${challengeId}/submit`,
      { method: "POST", body: JSON.stringify({ flag }) },
    ),
  startLab: (challengeId: string) =>
    request<{ sessionId: string; status: string }>(
      `/labs/${challengeId}/start`,
      { method: "POST" },
    ),
  health: () => request<{ status: string }>("/health"),
};
