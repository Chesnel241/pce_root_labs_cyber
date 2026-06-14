import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Layers, Target, Zap } from "lucide-react";
import { getTrack, tracks, trackChallengeCount } from "@/lib/curriculum";
import { accentMeta } from "@/lib/style-maps";
import { trackIcon } from "@/lib/icons";
import { trackProgress } from "@/lib/demo";
import { Progress } from "@/components/ui/progress";
import { ModuleAccordion } from "@/components/module-accordion";
import { formatNumber } from "@/lib/utils";

export function generateStaticParams() {
  return tracks.map((t) => ({ trackId: t.id }));
}

export function generateMetadata({
  params,
}: {
  params: { trackId: string };
}) {
  const track = getTrack(params.trackId);
  return { title: track?.name ?? "Parcours" };
}

export default function TrackDetailPage({
  params,
}: {
  params: { trackId: string };
}) {
  const track = getTrack(params.trackId);
  if (!track) notFound();

  const accent = accentMeta[track.accent];
  const Icon = trackIcon(track.icon);
  const progress = trackProgress().find((p) => p.trackId === track.id);
  const challenges = trackChallengeCount(track);

  return (
    <div className="space-y-6">
      <Link
        href="/tracks"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tous les parcours
      </Link>

      {/* Hero */}
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
                value={`${progress?.solved ?? 0}/${challenges}`}
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
                  {progress?.percent ?? 0}%
                </span>
              </div>
              <Progress
                value={progress?.percent ?? 0}
                barClassName={accent.bar}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modules */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Modules &amp; challenges
        </h2>
        <ModuleAccordion modules={track.modules} accentBar={accent.bar} />
      </div>
    </div>
  );
}

function HeroStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Layers;
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
