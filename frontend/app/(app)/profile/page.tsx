import {
  Boxes,
  Crosshair,
  Flag,
  Flame,
  KeyRound,
  Lock,
  Radar,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { getTrack, totals } from "@/lib/curriculum";
import {
  badges,
  currentRank,
  currentUser,
  earnedXp,
  solvedChallengeIds,
  streakDays,
  trackProgress,
} from "@/lib/demo";
import { accentMeta } from "@/lib/style-maps";
import { trackIcon } from "@/lib/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn, formatNumber } from "@/lib/utils";

export const metadata = { title: "Profil" };

const badgeIcons: Record<string, LucideIcon> = {
  Flag,
  Crosshair,
  KeyRound,
  Flame,
  Boxes,
  Radar,
};

export default function ProfilePage() {
  const xp = earnedXp();
  const earnedBadges = badges.filter((b) => b.earned).length;
  const progress = trackProgress();

  return (
    <div className="space-y-6">
      {/* Identity */}
      <Card>
        <CardContent className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-foreground text-2xl font-semibold text-background">
            {currentUser.username.slice(0, 2).toUpperCase()}
          </span>
          <div className="text-center sm:text-left">
            <h1 className="text-xl font-semibold tracking-tight">
              {currentUser.username}
            </h1>
            <p className="text-sm text-muted-foreground">{currentUser.role}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {currentUser.email}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6 sm:ml-auto">
            <Metric label="XP" value={formatNumber(xp)} />
            <Metric label="Rang" value={`#${currentRank()}`} />
            <Metric label="Série" value={`${streakDays}j`} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Badges */}
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
              {badges.map((badge) => {
                const Icon = badge.earned
                  ? (badgeIcons[badge.icon] ?? Trophy)
                  : Lock;
                return (
                  <div
                    key={badge.id}
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
              })}
            </CardContent>
          </Card>
        </div>

        {/* Per-track progress */}
        <Card>
          <CardHeader>
            <CardTitle>Progression</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="rounded-lg bg-surface-muted p-3 text-sm">
              <span className="font-semibold">{solvedChallengeIds.size}</span>
              <span className="text-muted-foreground">
                {" "}
                / {totals.challenges} challenges résolus
              </span>
            </div>
            {progress.map((p) => {
              const track = getTrack(p.trackId)!;
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
