import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { type Track, trackChallengeCount } from "@/lib/curriculum";
import { accentMeta } from "@/lib/style-maps";
import { trackIcon } from "@/lib/icons";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/utils";

interface TrackCardProps {
  track: Track;
  solved: number;
  percent: number;
}

export function TrackCard({ track, solved, percent }: TrackCardProps) {
  const accent = accentMeta[track.accent];
  const Icon = trackIcon(track.icon);
  const challenges = trackChallengeCount(track);

  return (
    <Link href={`/tracks/${track.id}`} className="group block">
      <Card
        className={`flex h-full flex-col p-5 transition-all hover:shadow-card-hover ${accent.border}`}
      >
        <div className="flex items-start gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accent.tile}`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold tracking-tight">
              {track.name}
            </h3>
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {track.subtitle}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>

        <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">
          {track.description}
        </p>

        <div className="mt-auto pt-5">
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
        </div>
      </Card>
    </Link>
  );
}
