"use client";

/**
 * Hooks de données "live".
 *
 * Chaque hook ne fait des appels réseau que lorsque l'API est configurée (et,
 * pour les ressources protégées, lorsqu'un utilisateur est authentifié). Sinon
 * il reste inerte : `data` vaut null, `loading` false, et les pages utilisent
 * leur baseline de démo rendue côté serveur (SSG). Cela garantit que la
 * génération statique et le mode hors-backend continuent de fonctionner.
 *
 * Les appels se font dans useEffect (côté client uniquement), ce qui hydrate /
 * remplace le rendu serveur sans casser generateStaticParams.
 */

import * as React from "react";
import { useAuth } from "@/lib/auth";
import {
  api,
  type ApiTrack,
  type LeaderboardEntry,
  type ProgressResponse,
  type ApiChallengeDetail,
} from "@/lib/api";

export interface LiveState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Petit moteur générique : exécute `fetcher` quand `enabled` est vrai.
 * Annule proprement au démontage / au changement de dépendances.
 */
function useLiveResource<T>(
  fetcher: () => Promise<T>,
  enabled: boolean,
  deps: React.DependencyList,
): LiveState<T> {
  const [state, setState] = React.useState<LiveState<T>>({
    data: null,
    loading: enabled,
    error: null,
  });

  React.useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : "Erreur réseau",
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

/** Curriculum annoté (progress, solved) pour l'utilisateur courant. */
export function useTracks(): LiveState<ApiTrack[]> {
  const { apiEnabled, isAuthenticated, loading: authLoading } = useAuth();
  const enabled = apiEnabled && isAuthenticated && !authLoading;
  return useLiveResource(
    async () => (await api.tracks()).tracks,
    enabled,
    [enabled],
  );
}

/** Progression agrégée de l'utilisateur (XP, rang, série, par parcours). */
export function useProgress(): LiveState<ProgressResponse> {
  const { apiEnabled, isAuthenticated, loading: authLoading } = useAuth();
  const enabled = apiEnabled && isAuthenticated && !authLoading;
  return useLiveResource(() => api.progress(), enabled, [enabled]);
}

/** Classement global. Ne nécessite pas d'authentification. */
export function useLeaderboard(): LiveState<LeaderboardEntry[]> {
  const { apiEnabled } = useAuth();
  return useLiveResource(
    async () => (await api.leaderboard()).leaderboard,
    apiEnabled,
    [apiEnabled],
  );
}

/** Détail d'un challenge (solved, points, lab, etc.). */
export function useChallenge(
  challengeId: string,
): LiveState<ApiChallengeDetail> {
  const { apiEnabled } = useAuth();
  return useLiveResource(
    async () => (await api.challenge(challengeId)).challenge,
    apiEnabled,
    [apiEnabled, challengeId],
  );
}
