/**
 * Client API léger.
 *
 * Le frontend fonctionne en autonomie avec les données de démo (lib/demo.ts).
 * Dès que le backend tourne, définissez NEXT_PUBLIC_API_URL et ces helpers
 * deviennent la source de vérité. Les formes de réponse suivent le contrat
 * défini côté backend (voir backend/README.md).
 *
 * Stratégie de repli (fallback) démo :
 *   - `apiEnabled()` indique si NEXT_PUBLIC_API_URL est défini : sans lui, le
 *     frontend reste 100 % en mode démo et n'émet aucune requête réseau.
 *   - Toute requête qui échoue (réseau, 5xx, backend dégradé) doit être
 *     rattrapée par l'appelant qui retombe alors sur les données de démo.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** True quand une URL d'API est configurée (donc mode "live" possible). */
export function apiEnabled(): boolean {
  return API_URL.trim().length > 0;
}

/**
 * URL WebSocket du terminal, dérivée de NEXT_PUBLIC_API_URL (http->ws).
 * Retourne null si l'API n'est pas configurée.
 */
export function terminalWsUrl(sessionId: string, token: string): string | null {
  if (!apiEnabled()) return null;
  const base = API_URL.replace(/^http/i, "ws").replace(/\/$/, "");
  const params = new URLSearchParams({ sessionId, token });
  return `${base}/ws/terminal?${params.toString()}`;
}

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
    this.name = "ApiError";
  }
}

/* ------------------------------------------------------------------ */
/* Types (forme des réponses backend)                                  */
/* ------------------------------------------------------------------ */

export interface ApiUser {
  id: string;
  email: string;
  username: string;
  xp: number;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: ApiUser;
}

export interface ApiChallenge {
  id: string;
  title: string;
  description: string;
  points: number;
  lab: string | null;
  hasLab: boolean;
  solved: boolean;
}

export interface ApiModule {
  id: string;
  name: string;
  difficulty: string;
  xp: number;
  summary: string;
  challenges: ApiChallenge[];
  progress: number;
  solvedCount: number;
  challengeCount: number;
}

export interface ApiTrack {
  id: string;
  order: number;
  name: string;
  subtitle: string;
  description: string;
  accent: string;
  icon: string;
  totalXp: number;
  modules: ApiModule[];
  progress: number;
  solvedCount: number;
  challengeCount: number;
}

export interface ApiChallengeDetail {
  id: string;
  title: string;
  description: string;
  points: number;
  difficulty: string;
  trackId: string;
  trackName: string;
  moduleId: string;
  moduleName: string;
  lab: string | null;
  hasLab: boolean;
  hintsCount: number;
  flagPrefix: string;
  solved: boolean;
}

export interface SubmitResult {
  correct: boolean;
  awardedPoints: number;
  totalXp: number;
  alreadySolved: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  xp: number;
  solvedCount: number;
}

export interface TrackProgressEntry {
  trackId: string;
  solved: number;
  total: number;
  xp: number;
}

export interface ProgressResponse {
  totalXp: number;
  rank: number | null;
  solvedCount: number;
  totalChallenges: number;
  byTrack: TrackProgressEntry[];
  streak: number;
}

export interface LabSession {
  sessionId: string;
  status: string;
  expiresAt?: string;
}

export interface HealthResponse {
  status: string;
  db?: string;
  docker?: string;
  version?: string;
}

/* ------------------------------------------------------------------ */
/* Requêteur                                                           */
/* ------------------------------------------------------------------ */

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!apiEnabled()) {
    // Sans API configurée on ne tente aucune requête : l'appelant retombe
    // immédiatement sur les données de démo.
    throw new ApiError(0, "API non configurée");
  }
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
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  register: (data: { email: string; username: string; password: string }) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: () => request<ApiUser>("/auth/me"),
  tracks: () => request<{ tracks: ApiTrack[] }>("/tracks"),
  track: (trackId: string) =>
    request<{ track: ApiTrack }>(`/tracks/${encodeURIComponent(trackId)}`),
  challenge: (challengeId: string) =>
    request<{ challenge: ApiChallengeDetail }>(
      `/challenges/${encodeURIComponent(challengeId)}`,
    ),
  submitFlag: (challengeId: string, flag: string) =>
    request<SubmitResult>(
      `/challenges/${encodeURIComponent(challengeId)}/submit`,
      { method: "POST", body: JSON.stringify({ flag }) },
    ),
  leaderboard: () =>
    request<{ leaderboard: LeaderboardEntry[] }>("/leaderboard"),
  progress: () => request<ProgressResponse>("/me/progress"),
  startLab: (challengeId: string) =>
    request<LabSession>(`/labs/${encodeURIComponent(challengeId)}/start`, {
      method: "POST",
    }),
  labSession: (sessionId: string) =>
    request<LabSession>(`/labs/sessions/${encodeURIComponent(sessionId)}`),
  stopLab: (sessionId: string) =>
    request<{ status: string }>(
      `/labs/sessions/${encodeURIComponent(sessionId)}/stop`,
      { method: "POST" },
    ),
  health: () => request<HealthResponse>("/health"),
};
