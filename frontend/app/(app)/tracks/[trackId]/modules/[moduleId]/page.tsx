import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Flag, Target, Zap } from "lucide-react";
import { getTrack, tracks, type Track } from "@/lib/curriculum";
import { accentMeta, difficultyMeta } from "@/lib/style-maps";
import { isSolved } from "@/lib/demo";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  const params: { trackId: string; moduleId: string }[] = [];
  for (const track of tracks) {
    for (const mod of track.modules) {
      params.push({ trackId: track.id, moduleId: mod.id });
    }
  }
  return params;
}

function resolve(trackId: string, moduleId: string) {
  const track = getTrack(trackId);
  const mod = track?.modules.find((m) => m.id === moduleId);
  if (!track || !mod) return null;
  return { track, mod } as { track: Track; mod: Track["modules"][number] };
}

export function generateMetadata({
  params,
}: {
  params: { trackId: string; moduleId: string };
}) {
  const resolved = resolve(params.trackId, params.moduleId);
  return { title: resolved?.mod.name ?? "Module" };
}

export default function ModuleDetailPage({
  params,
}: {
  params: { trackId: string; moduleId: string };
}) {
  const resolved = resolve(params.trackId, params.moduleId);
  if (!resolved) notFound();
  const { track, mod } = resolved;

  const accent = accentMeta[track.accent];
  const diff = difficultyMeta[mod.difficulty];
  const total = mod.challenges.length;
  const solved = mod.challenges.filter((c) => isSolved(c.id)).length;
  const percent = total === 0 ? 0 : Math.round((solved / total) * 100);

  return (
    <div className="space-y-6">
      <Link
        href={`/tracks/${track.id}`}
        className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="h-4 w-4" />
        {track.name}
      </Link>

      {/* Hero */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm font-medium text-muted-foreground">
            {mod.id}
          </span>
          <Badge className={diff.badge}>{diff.label}</Badge>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
            <Zap className="h-4 w-4" />
            {mod.xp} XP
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {mod.name}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {mod.summary}
        </p>

        <div className="mt-5 border-t border-border pt-5">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <Target className="h-4 w-4" />
              {solved}/{total} challenges résolus
            </span>
            <span className={cn("font-semibold", accent.text)}>{percent}%</span>
          </div>
          <Progress value={percent} barClassName={accent.bar} />
        </div>
      </div>

      {/* Challenges */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Challenges
        </h2>
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {mod.challenges.map((challenge) => {
              const done = isSolved(challenge.id);
              return (
                <li key={challenge.id}>
                  <Link
                    href={`/challenges/${challenge.id}`}
                    className="flex items-center gap-3 px-5 py-4 outline-none transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
                  >
                    {done ? (
                      <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="h-[18px] w-[18px] shrink-0 text-muted-foreground/40" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium">
                        {challenge.title}
                      </span>
                      <p className="truncate text-sm text-muted-foreground">
                        {challenge.description}
                      </p>
                    </div>
                    {challenge.lab && (
                      <Badge className="hidden bg-primary-soft text-primary ring-primary/15 sm:inline-flex">
                        <Flag className="h-3 w-3" /> Lab
                      </Badge>
                    )}
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      +{challenge.points}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
