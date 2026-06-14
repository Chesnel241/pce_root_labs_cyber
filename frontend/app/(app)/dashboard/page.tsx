import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Flag,
  Flame,
  PlayCircle,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { allChallenges, totals } from "@/lib/curriculum";
import {
  currentRank,
  currentUser,
  earnedXp,
  isSolved,
  recentActivity,
  solvedChallengeIds,
  streakDays,
  trackProgress,
} from "@/lib/demo";
import { accentMeta } from "@/lib/style-maps";
import { trackIcon } from "@/lib/icons";
import { getTrack } from "@/lib/curriculum";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { formatNumber } from "@/lib/utils";

function nextChallenge() {
  return allChallenges().find(({ challenge }) => !isSolved(challenge.id));
}

const activityIcon = {
  solved: CheckCircle2,
  started: PlayCircle,
  badge: Trophy,
} as const;

export default function DashboardPage() {
  const xp = earnedXp();
  const solved = solvedChallengeIds.size;
  const progress = trackProgress();
  const next = nextChallenge();

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bonjour, {currentUser.username} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Voici un aperçu de votre progression sur le cyber range.
        </p>
      </div>

      {/* Stats */}
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
          value={`#${currentRank()}`}
          icon={Trophy}
          hint="sur la plateforme"
        />
        <StatCard
          label="Challenges résolus"
          value={`${solved}/${totals.challenges}`}
          icon={Target}
          hint={`${Math.round((solved / totals.challenges) * 100)}% complété`}
        />
        <StatCard
          label="Série en cours"
          value={`${streakDays} jours`}
          icon={Flame}
          hint="continuez !"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Continue learning */}
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
                      Challenge {next.challenge.id} ·{" "}
                      {next.track.name}
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

          {/* Track progress */}
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
              {progress.map((p) => {
                const track = getTrack(p.trackId)!;
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

        {/* Activity */}
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
                débloquer le badge <span className="font-medium">Red Cloud</span>
                .
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
