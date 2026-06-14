import { allChallenges, tracks, trackChallengeCount } from "./curriculum";

/**
 * Données de démonstration.
 *
 * Permettent de présenter l'UI (dashboard, progression, classement) sans
 * backend. Quand l'API sera branchée, ces helpers seront remplacés par des
 * appels à `lib/api.ts`. La forme des objets est volontairement proche de la
 * réponse API attendue.
 */

export interface DemoUser {
  id: string;
  username: string;
  email: string;
  role: string;
  joinedAt: string;
}

export const currentUser: DemoUser = {
  id: "u_demo",
  username: "chesnel241",
  email: "ekoghachesneloff@gmail.com",
  role: "Analyste Sécurité Cloud",
  joinedAt: "2026-02-01",
};

/** Challenges considérés comme résolus dans la démo (par id). */
export const solvedChallengeIds = new Set<string>([
  "1.1.1",
  "1.1.2",
  "1.1.3",
  "1.1.4",
  "1.2.1",
  "1.2.2",
  "1.2.3",
  "2.1.1",
  "2.1.2",
  "2.1.3",
  "3.3.1",
  "5.1.1",
  "5.1.2",
]);

export function isSolved(challengeId: string): boolean {
  return solvedChallengeIds.has(challengeId);
}

export function earnedXp(): number {
  return allChallenges()
    .filter(({ challenge }) => solvedChallengeIds.has(challenge.id))
    .reduce((sum, { challenge }) => sum + challenge.points, 0);
}

export interface TrackProgress {
  trackId: string;
  solved: number;
  total: number;
  xp: number;
  percent: number;
}

export function trackProgress(): TrackProgress[] {
  return tracks.map((track) => {
    let solved = 0;
    let xp = 0;
    for (const module of track.modules) {
      for (const challenge of module.challenges) {
        if (solvedChallengeIds.has(challenge.id)) {
          solved += 1;
          xp += challenge.points;
        }
      }
    }
    const total = trackChallengeCount(track);
    return {
      trackId: track.id,
      solved,
      total,
      xp,
      percent: total === 0 ? 0 : Math.round((solved / total) * 100),
    };
  });
}

export function moduleSolved(moduleChallengeIds: string[]): number {
  return moduleChallengeIds.filter((id) => solvedChallengeIds.has(id)).length;
}

/* ----------------------------- Leaderboard ------------------------------ */

export interface LeaderboardRow {
  rank: number;
  username: string;
  xp: number;
  solved: number;
  isCurrentUser?: boolean;
}

export const leaderboard: LeaderboardRow[] = [
  { rank: 1, username: "nyx.0xff", xp: 6480, solved: 58 },
  { rank: 2, username: "m.dubois", xp: 5920, solved: 53 },
  { rank: 3, username: "cloud_raptor", xp: 5310, solved: 49 },
  { rank: 4, username: "a.benali", xp: 4870, solved: 44 },
  { rank: 5, username: "svc-blue", xp: 4120, solved: 39 },
  {
    rank: 6,
    username: currentUser.username,
    xp: earnedXp(),
    solved: solvedChallengeIds.size,
    isCurrentUser: true,
  },
  { rank: 7, username: "l.moreau", xp: 1180, solved: 11 },
  { rank: 8, username: "k8s_ninja", xp: 980, solved: 9 },
].sort((a, b) => b.xp - a.xp).map((row, i) => ({ ...row, rank: i + 1 }));

export function currentRank(): number {
  return (
    leaderboard.find((r) => r.isCurrentUser)?.rank ?? leaderboard.length
  );
}

/* ----------------------------- Activity --------------------------------- */

export interface ActivityItem {
  id: string;
  type: "solved" | "started" | "badge";
  label: string;
  detail: string;
  at: string;
}

export const recentActivity: ActivityItem[] = [
  {
    id: "a1",
    type: "solved",
    label: "Challenge résolu",
    detail: "Security Group trop permissif (+75 XP)",
    at: "Il y a 2 h",
  },
  {
    id: "a2",
    type: "badge",
    label: "Badge débloqué",
    detail: "Recon Master — module 1.1 complété",
    at: "Hier",
  },
  {
    id: "a3",
    type: "solved",
    label: "Challenge résolu",
    detail: "RDS exposée sur internet (+75 XP)",
    at: "Hier",
  },
  {
    id: "a4",
    type: "started",
    label: "Lab démarré",
    detail: "PrivEsc via PassRole + CreateAccessKey",
    at: "Il y a 2 j",
  },
];

/* ------------------------------ Badges ---------------------------------- */

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

export const badges: Badge[] = [
  {
    id: "first-blood",
    name: "First Blood",
    description: "Résoudre votre premier challenge.",
    icon: "Flag",
    earned: true,
  },
  {
    id: "recon-master",
    name: "Recon Master",
    description: "Compléter le module Reconnaissance & Énumération.",
    icon: "Crosshair",
    earned: true,
  },
  {
    id: "key-keeper",
    name: "Key Keeper",
    description: "Compléter le module Audit des Politiques IAM.",
    icon: "KeyRound",
    earned: false,
  },
  {
    id: "streak-7",
    name: "Série de 7 jours",
    description: "S'entraîner 7 jours d'affilée.",
    icon: "Flame",
    earned: true,
  },
  {
    id: "container-breaker",
    name: "Container Breaker",
    description: "Réussir une évasion de conteneur.",
    icon: "Boxes",
    earned: false,
  },
  {
    id: "blue-team",
    name: "Blue Team",
    description: "Compléter un module SOC & Detection.",
    icon: "Radar",
    earned: false,
  },
];

export const streakDays = 7;
