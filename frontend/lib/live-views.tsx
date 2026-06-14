"use client";

/**
 * Vues "live" des pages principales.
 *
 * Chaque vue rend exactement le même markup que la version de démo (look
 * corporate inchangé) mais fusionne la baseline démo avec les données live
 * lorsqu'elles sont disponibles (utilisateur authentifié + API configurée).
 * En l'absence d'API ou d'authentification, ces vues affichent les valeurs de
 * démo : le rendu serveur (SSG) reste donc parfaitement valide et le mode
 * hors-backend continue de fonctionner.
 *
 * Les pages (app/(app)/...) restent des Server Components qui exportent leurs
 * metadata/generateStaticParams et délèguent l'affichage à ces vues.
 */

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Crosshair,
  Crown,
  Flag,
  Flame,
  KeyRound,
  Layers,
  Lock,
  Medal,
  PlayCircle,
  Radar,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  allChallenges,
  getTrack,
  tracks as curriculumTracks,
  totals,
  trackChallengeCount,
  type Difficulty,
  type Module,
} from "@/lib/curriculum";
import {
  badges,
  currentRank,
  currentUser,
  earnedXp,
  isSolved,
  leaderboard as demoLeaderboard,
  recentActivity,
  solvedChallengeIds,
  streakDays,
  trackProgress,
  type LeaderboardRow,
  type TrackProgress,
} from "@/lib/demo";
import { accentMeta } from "@/lib/style-maps";
import { trackIcon } from "@/lib/icons";
import { difficultyMeta } from "@/lib/style-maps";
import { cn, formatNumber } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  useLeaderboard,
  useProgress,
  useTracks,
} from "@/lib/use-platform-data";
import type { ApiTrack, ProgressResponse } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { PageHeader } from "@/components/ui/page-header";
import { TrackCard } from "@/components/track-card";
import { ModuleAccordion } from "@/components/module-accordion";

/* ------------------------------------------------------------------ */
/* Helpers de fusion démo <-> live                                     */
/* ------------------------------------------------------------------ */

/** Progression par parcours : map trackId -> {solved,total,xp,percent}. */
function liveTrackProgress(
  progress: ProgressResponse | null,
): TrackProgress[] | null {
  if (!progress) return null;
  return progress.byTrack.map((t) => ({
    trackId: t.trackId,
    solved: t.solved,
    total: t.total,
    xp: t.xp,
    percent: t.total === 0 ? 0 : Math.round((t.solved / t.total) * 100),
  }));
}

/** Set des challenges résolus à partir des tracks annotés live. */
function liveSolvedSet(tracks: ApiTrack[] | null): Set<string> | null {
  if (!tracks) return null;
  const set = new Set<string>();
  for (const track of tracks) {
    for (const module of track.modules) {
      for (const c of module.challenges) {
        if (c.solved) set.add(c.id);
      }
    }
  }
  return set;
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

const activityIcon = {
  solved: CheckCircle2,
  started: PlayCircle,
  badge: Trophy,
} as const;

export function DashboardView() {
  const { user, isAuthenticated } = useAuth();
  const progress = useProgress();
  const tracksState = useTracks();

  const liveProgress = liveTrackProgress(progress.data);
  const solvedSet = liveSolvedSet(tracksState.data);

  const xp =
    progress.data?.totalXp ??
    (isAuthenticated ? user?.xp ?? 0 : earnedXp());
  const solved = progress.data?.solvedCount ?? solvedChallengeIds.size;
  const totalChallenges =
    progress.data?.totalChallenges ?? totals.challenges;
  const rank =
    progress.data?.rank != null ? progress.data.rank : currentRank();
  const streak = progress.data?.streak ?? streakDays;
  const username = user?.username ?? currentUser.username;

  const trackRows = liveProgress ?? trackProgress();

  // Prochain challenge non résolu (live si dispo, sinon démo).
  const next = allChallenges().find(({ challenge }) =>
    solvedSet ? !solvedSet.has(challenge.id) : !isSolved(challenge.id),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bonjour, {username} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Voici un aperçu de votre progression sur le cyber range.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="XP total"
          value={formatNumber(xp)}
          icon={Zap}
          hint="cette saison"
          trend={{ value: "+225", positive: true }}
        />
        <StatCard
          label="Classement"
          value={`#${rank}`}
          icon={Trophy}
          hint="sur la plateforme"
        />
        <StatCard
          label="Challenges résolus"
          value={`${solved}/${totalChallenges}`}
          icon={Target}
          hint={`${
            totalChallenges ? Math.round((solved / totalChallenges) * 100) : 0
          }% complété`}
        />
        <StatCard
          label="Série en cours"
          value={`${streak} jours`}
          icon={Flame}
          hint="continuez !"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {next && (
            <Card className="overflow-hidden">
              <div className="border-b border-border bg-surface-muted px-5 py-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Reprendre l&apos;entraînement
                </span>
              </div>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Challenge {next.challenge.id} · {next.track.name}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-lg font-semibold tracking-tight">
                    {next.challenge.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {next.challenge.description}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <DifficultyBadge difficulty={next.module.difficulty} />
                    <span className="text-xs font-medium text-muted-foreground">
                      +{next.challenge.points} XP
                    </span>
                  </div>
                </div>
                <Link href={`/challenges/${next.challenge.id}`}>
                  <Button size="lg" className="w-full sm:w-auto">
                    <PlayCircle className="h-4 w-4" />
                    Démarrer le lab
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Progression par parcours</CardTitle>
              <Link
                href="/tracks"
                className="text-sm font-medium text-primary hover:underline"
              >
                Tout voir
              </Link>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {trackRows.map((p) => {
                const track = getTrack(p.trackId);
                if (!track) return null;
                const accent = accentMeta[track.accent];
                const Icon = trackIcon(track.icon);
                return (
                  <Link
                    key={p.trackId}
                    href={`/tracks/${p.trackId}`}
                    className="flex items-center gap-4 rounded-lg p-2 transition-colors hover:bg-surface-muted"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent.tile}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="truncate text-sm font-medium">
                          {track.name}
                        </span>
                        <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                          {p.solved}/{p.total}
                        </span>
                      </div>
                      <Progress value={p.percent} barClassName={accent.bar} />
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ol className="space-y-4">
                {recentActivity.map((item) => {
                  const Icon = activityIcon[item.type];
                  return (
                    <li key={item.id} className="flex gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {item.detail}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.at}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>

          <Card className="bg-primary-soft">
            <CardContent>
              <div className="flex items-center gap-2 text-primary">
                <Trophy className="h-5 w-5" />
                <span className="font-semibold">Objectif de la semaine</span>
              </div>
              <p className="mt-2 text-sm text-foreground/80">
                Complétez le parcours{" "}
                <span className="font-medium">Cloud Pentesting</span> pour
                débloquer le badge{" "}
                <span className="font-medium">Red Cloud</span>.
              </p>
              <Link href="/tracks/cloud-pentesting">
                <Button variant="secondary" size="sm" className="mt-4">
                  Continuer
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tracks list                                                         */
/* ------------------------------------------------------------------ */

export function TracksView() {
  const tracksState = useTracks();
  const progress = useProgress();

  // Map trackId -> {solved, percent} (live si dispo, sinon démo).
  const liveProgress = liveTrackProgress(progress.data);
  const annotated = tracksState.data;

  const map = new Map<string, { solved: number; percent: number }>();
  if (annotated) {
    for (const t of annotated) {
      map.set(t.id, { solved: t.solvedCount, percent: t.progress });
    }
  } else if (liveProgress) {
    for (const p of liveProgress) {
      map.set(p.trackId, { solved: p.solved, percent: p.percent });
    }
  } else {
    for (const p of trackProgress()) {
      map.set(p.trackId, { solved: p.solved, percent: p.percent });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parcours de spécialisation"
        description="Six parcours métier couvrant l'offensif comme le défensif. Progressez module par module et validez les challenges pour gagner de l'XP."
      />

      <div className="flex flex-wrap gap-x-8 gap-y-2 rounded-xl border border-border bg-surface px-5 py-4 text-sm">
        <Stat label="Parcours" value={totals.tracks} />
        <Stat label="Modules" value={totals.modules} />
        <Stat label="Challenges" value={totals.challenges} />
        <Stat label="XP disponible" value={formatNumber(totals.xp)} />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {curriculumTracks.map((track) => {
          const p = map.get(track.id);
          return (
            <TrackCard
              key={track.id}
              track={track}
              solved={p?.solved ?? 0}
              percent={p?.percent ?? 0}
            />
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-lg font-semibold tracking-tight">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Track detail                                                        */
/* ------------------------------------------------------------------ */

export function TrackDetailView({ trackId }: { trackId: string }) {
  const track = getTrack(trackId);
  const tracksState = useTracks();

  // Recherche les annotations live pour ce track.
  const liveTrack = tracksState.data?.find((t) => t.id === trackId) ?? null;

  if (!track) return null;

  const accent = accentMeta[track.accent];
  const Icon = trackIcon(track.icon);
  const challenges = trackChallengeCount(track);

  const demoProgress = trackProgress().find((p) => p.trackId === track.id);
  const solved = liveTrack?.solvedCount ?? demoProgress?.solved ?? 0;
  const percent = liveTrack?.progress ?? demoProgress?.percent ?? 0;

  // Set des challenges résolus pour ce track (live -> override de l'accordéon).
  const solvedIds = liveTrack
    ? new Set(
        liveTrack.modules.flatMap((m) =>
          m.challenges.filter((c) => c.solved).map((c) => c.id),
        ),
      )
    : null;

  return (
    <div className="space-y-6">
      <Link
        href="/tracks"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon />
        Tous les parcours
      </Link>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${accent.tile}`}
          >
            <Icon className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {track.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {track.description}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-4 border-t border-border pt-5">
              <HeroStat
                icon={Layers}
                value={track.modules.length}
                label="Modules"
              />
              <HeroStat
                icon={Target}
                value={`${solved}/${challenges}`}
                label="Challenges"
              />
              <HeroStat
                icon={Zap}
                value={formatNumber(track.totalXp)}
                label="XP total"
              />
            </div>

            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">
                  Progression
                </span>
                <span className={`font-semibold ${accent.text}`}>
                  {percent}%
                </span>
              </div>
              <Progress value={percent} barClassName={accent.bar} />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Modules &amp; challenges
        </h2>
        <ModuleAccordion
          modules={track.modules as Module[]}
          accentBar={accent.bar}
          solvedIds={solvedIds}
        />
      </div>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function HeroStat({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div>
        <p className="text-lg font-semibold leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Leaderboard                                                         */
/* ------------------------------------------------------------------ */

export function LeaderboardView() {
  const { user } = useAuth();
  const lb = useLeaderboard();

  const rows: LeaderboardRow[] = React.useMemo(() => {
    if (lb.data && lb.data.length > 0) {
      return lb.data.map((r) => ({
        rank: r.rank,
        username: r.username,
        xp: r.xp,
        solved: r.solvedCount,
        isCurrentUser: user ? r.username === user.username : false,
      }));
    }
    return demoLeaderboard;
  }, [lb.data, user]);

  const podium = rows.slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classement"
        description="Les meilleurs analystes du cyber range, classés par expérience accumulée."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {podium.map((row) => (
          <Card
            key={row.rank}
            className={cn(
              "flex flex-col items-center p-6 text-center",
              row.rank === 1 && "ring-1 ring-amber-300 dark:ring-amber-500/40",
            )}
          >
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                row.rank === 1
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                  : row.rank === 2
                    ? "bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-300"
                    : "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
              )}
            >
              {row.rank === 1 ? (
                <Crown className="h-6 w-6" />
              ) : (
                <Medal className="h-6 w-6" />
              )}
            </span>
            <p className="mt-3 font-semibold">{row.username}</p>
            <p className="text-sm text-muted-foreground">
              {row.solved} challenges
            </p>
            <p className="mt-2 flex items-center gap-1 text-lg font-semibold text-primary">
              <Zap className="h-4 w-4" />
              {formatNumber(row.xp)}
            </p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Rang</th>
              <th className="px-5 py-3 font-medium">Analyste</th>
              <th className="px-5 py-3 text-right font-medium">Challenges</th>
              <th className="px-5 py-3 text-right font-medium">XP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.rank}-${row.username}`}
                className={cn(
                  "border-b border-border last:border-0 transition-colors hover:bg-surface-muted",
                  row.isCurrentUser && "bg-primary-soft/60",
                )}
              >
                <td className="px-5 py-3">
                  <span className="font-mono font-medium text-muted-foreground">
                    #{row.rank}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                      {row.username.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="font-medium">
                      {row.username}
                      {row.isCurrentUser && (
                        <span className="ml-2 text-xs font-normal text-primary">
                          (vous)
                        </span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right text-muted-foreground">
                  {row.solved}
                </td>
                <td className="px-5 py-3 text-right font-semibold">
                  {formatNumber(row.xp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

const badgeIconComponents: Record<string, LucideIcon> = {
  Flag,
  Crosshair,
  KeyRound,
  Flame,
  Boxes,
  Radar,
  Trophy,
};

export function ProfileView() {
  const { user, isAuthenticated } = useAuth();
  const progress = useProgress();

  const liveProgress = liveTrackProgress(progress.data);
  const xp =
    progress.data?.totalXp ?? (isAuthenticated ? user?.xp ?? 0 : earnedXp());
  const rank =
    progress.data?.rank != null ? progress.data.rank : currentRank();
  const streak = progress.data?.streak ?? streakDays;
  const solved = progress.data?.solvedCount ?? solvedChallengeIds.size;
  const totalChallenges = progress.data?.totalChallenges ?? totals.challenges;
  const username = user?.username ?? currentUser.username;
  const email = user?.email ?? currentUser.email;
  const role = currentUser.role;

  const earnedBadges = badges.filter((b) => b.earned).length;
  const rows = liveProgress ?? trackProgress();

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-foreground text-2xl font-semibold text-background">
            {username.slice(0, 2).toUpperCase()}
          </span>
          <div className="text-center sm:text-left">
            <h1 className="text-xl font-semibold tracking-tight">{username}</h1>
            <p className="text-sm text-muted-foreground">{role}</p>
            <p className="mt-1 text-sm text-muted-foreground">{email}</p>
          </div>
          <div className="grid grid-cols-3 gap-6 sm:ml-auto">
            <Metric label="XP" value={formatNumber(xp)} />
            <Metric label="Rang" value={`#${rank}`} />
            <Metric label="Série" value={`${streak}j`} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Badges
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {earnedBadges}/{badges.length} débloqués
              </span>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3">
              {badges.map((badge) => (
                <ProfileBadge key={badge.id} badge={badge} />
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Progression</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="rounded-lg bg-surface-muted p-3 text-sm">
              <span className="font-semibold">{solved}</span>
              <span className="text-muted-foreground">
                {" "}
                / {totalChallenges} challenges résolus
              </span>
            </div>
            {rows.map((p) => {
              const track = getTrack(p.trackId);
              if (!track) return null;
              const accent = accentMeta[track.accent];
              const Icon = trackIcon(track.icon);
              return (
                <div key={p.trackId}>
                  <div className="mb-1 flex items-center gap-2 text-sm">
                    <Icon className={cn("h-4 w-4", accent.text)} />
                    <span className="flex-1 truncate font-medium">
                      {track.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.percent}%
                    </span>
                  </div>
                  <Progress value={p.percent} barClassName={accent.bar} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileBadge({
  badge,
}: {
  badge: (typeof badges)[number];
}) {
  const Icon = badge.earned
    ? badgeIconComponents[badge.icon] ?? Trophy
    : Lock;
  return (
    <div
      className={cn(
        "rounded-xl border p-4 text-center transition-colors",
        badge.earned
          ? "border-border bg-surface"
          : "border-dashed border-border bg-surface-muted/40",
      )}
    >
      <span
        className={cn(
          "mx-auto flex h-11 w-11 items-center justify-center rounded-full",
          badge.earned
            ? "bg-primary-soft text-primary"
            : "bg-muted text-muted-foreground/60",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <p
        className={cn(
          "mt-2 text-sm font-medium",
          !badge.earned && "text-muted-foreground",
        )}
      >
        {badge.name}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {badge.description}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// Difficulty re-export so unused import warning is avoided when needed.
export type { Difficulty };
