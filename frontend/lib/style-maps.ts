import type { Difficulty, TrackAccent } from "./curriculum";

/**
 * Static class maps (full strings so Tailwind's JIT keeps them).
 * Couleurs volontairement douces / pro — pas de néon.
 */

export const difficultyMeta: Record<
  Difficulty,
  { label: string; badge: string; dot: string }
> = {
  easy: {
    label: "Facile",
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
    dot: "bg-emerald-500",
  },
  medium: {
    label: "Moyen",
    badge:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
    dot: "bg-amber-500",
  },
  hard: {
    label: "Difficile",
    badge:
      "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
    dot: "bg-rose-500",
  },
  expert: {
    label: "Expert",
    badge:
      "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-400/20",
    dot: "bg-violet-500",
  },
};

export interface AccentStyle {
  /** soft icon tile */
  tile: string;
  /** small text accent */
  text: string;
  /** progress bar fill */
  bar: string;
  /** thin top accent border */
  border: string;
}

export const accentMeta: Record<TrackAccent, AccentStyle> = {
  rose: {
    tile: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
    text: "text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
    border: "group-hover:border-rose-300 dark:group-hover:border-rose-500/40",
  },
  amber: {
    tile: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    text: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    border: "group-hover:border-amber-300 dark:group-hover:border-amber-500/40",
  },
  orange: {
    tile: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
    text: "text-orange-600 dark:text-orange-400",
    bar: "bg-orange-500",
    border:
      "group-hover:border-orange-300 dark:group-hover:border-orange-500/40",
  },
  emerald: {
    tile: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
    border:
      "group-hover:border-emerald-300 dark:group-hover:border-emerald-500/40",
  },
  sky: {
    tile: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    text: "text-sky-600 dark:text-sky-400",
    bar: "bg-sky-500",
    border: "group-hover:border-sky-300 dark:group-hover:border-sky-500/40",
  },
  violet: {
    tile: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    text: "text-violet-600 dark:text-violet-400",
    bar: "bg-violet-500",
    border:
      "group-hover:border-violet-300 dark:group-hover:border-violet-500/40",
  },
};

export const severityMeta: Record<
  "critical" | "high" | "medium" | "low",
  { label: string; badge: string }
> = {
  critical: {
    label: "Critique",
    badge:
      "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
  },
  high: {
    label: "Élevée",
    badge:
      "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-400/20",
  },
  medium: {
    label: "Moyenne",
    badge:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
  },
  low: {
    label: "Faible",
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
  },
};
