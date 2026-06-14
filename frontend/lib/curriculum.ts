import curriculumData from "./data/curriculum.json";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Difficulty = "easy" | "medium" | "hard" | "expert";
export type TrackAccent =
  | "rose"
  | "amber"
  | "orange"
  | "emerald"
  | "sky"
  | "violet";

export interface Challenge {
  id: string;
  title: string;
  description: string;
  points: number;
  lab?: string;
}

export interface Module {
  id: string;
  name: string;
  difficulty: Difficulty;
  xp: number;
  summary: string;
  challenges: Challenge[];
}

export interface Track {
  id: string;
  order: number;
  name: string;
  subtitle: string;
  description: string;
  accent: TrackAccent;
  icon: string;
  totalXp: number;
  modules: Module[];
}

export interface Vulnerability {
  id: string;
  name: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  tags: string[];
  description: string;
}

interface Curriculum {
  meta: { name: string; tracks: number; modules: number; challenges: number };
  tracks: Track[];
  vulnerabilities: Vulnerability[];
}

const curriculum = curriculumData as unknown as Curriculum;

/* ------------------------------------------------------------------ */
/* Accessors                                                           */
/* ------------------------------------------------------------------ */

export const tracks: Track[] = curriculum.tracks;
export const vulnerabilities: Vulnerability[] = curriculum.vulnerabilities;
export const meta = curriculum.meta;

export function getTrack(trackId: string): Track | undefined {
  return tracks.find((t) => t.id === trackId);
}

export function getModule(moduleId: string): Module | undefined {
  for (const track of tracks) {
    const found = track.modules.find((m) => m.id === moduleId);
    if (found) return found;
  }
  return undefined;
}

export interface ChallengeContext {
  challenge: Challenge;
  module: Module;
  track: Track;
}

export function getChallengeContext(
  challengeId: string,
): ChallengeContext | undefined {
  for (const track of tracks) {
    for (const module of track.modules) {
      const challenge = module.challenges.find((c) => c.id === challengeId);
      if (challenge) return { challenge, module, track };
    }
  }
  return undefined;
}

export function allChallenges(): ChallengeContext[] {
  const list: ChallengeContext[] = [];
  for (const track of tracks) {
    for (const module of track.modules) {
      for (const challenge of module.challenges) {
        list.push({ challenge, module, track });
      }
    }
  }
  return list;
}

export function trackChallengeCount(track: Track): number {
  return track.modules.reduce((sum, m) => sum + m.challenges.length, 0);
}

export const totals = {
  tracks: tracks.length,
  modules: tracks.reduce((s, t) => s + t.modules.length, 0),
  challenges: allChallenges().length,
  xp: tracks.reduce((s, t) => s + t.totalXp, 0),
};
