import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { type Track, trackChallengeCount } from "@/lib/curriculum";
import { accentMeta } from "@/lib/style-maps";
import { trackIcon } from "@/lib/icons";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn, formatNumber } from "@/lib/utils";

interface TrackCardProps {
  track: Track;
  solved: number;
  percent: number;
  /** Parcours verrouillé : navigation désactivée + état muté. */
  locked?: boolean;
}

export function TrackCard({ track, solved, percent, locked }: TrackCardProps) {
  const accent = accentMeta[track.accent];
  const Icon = trackIcon(track.icon);
  const challenges = trackChallengeCount(track);

  const body = (
    <Card
      className={cn(
        "flex h-full flex-col p-5 transition-all",
        locked
          ? "opacity-75"
          : `hover:shadow-card-hover ${accent.border}`,
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
            locked ? "bg-muted text-muted-foreground/70" : accent.tile,
          )}
        >
          {locked ? <Lock className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold tracking-tight">
            {track.name}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
            {track.subtitle}
          </p>
        </div>
        {locked ? (
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        ) : (
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        )}
      </div>

      {locked ? (
        <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">
          Terminez 70% du parcours précédent pour débloquer ce parcours.
        </p>
      ) : (
        <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">
          {track.description}
        </p>
      )}

      <div className="mt-auto pt-5">
        {locked ? (
          <div className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs font-medium text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Verrouillé
          </div>
        ) : (
          <>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">
                {solved}/{challenges} challenges
              </span>
              <span className={`font-semibold ${accent.text}`}>{percent}%</span>
            </div>
            <Progress value={percent} barClassName={accent.bar} />
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{track.modules.length} modules</span>
              <span aria-hidden>·</span>
              <span>{formatNumber(track.totalXp)} XP</span>
            </div>
          </>
        )}
      </div>
    </Card>
  );

  if (locked) {
    return (
      <div
        className="group block cursor-not-allowed"
        aria-disabled="true"
        title="Terminez 70% du parcours précédent pour débloquer ce parcours."
      >
        {body}
      </div>
    );
  }

  return (
    <Link href={`/tracks/${track.id}`} className="group block">
      {body}
    </Link>
  );
}
