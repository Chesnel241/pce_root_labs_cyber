import { tracks, totals } from "@/lib/curriculum";
import { trackProgress } from "@/lib/demo";
import { PageHeader } from "@/components/ui/page-header";
import { TrackCard } from "@/components/track-card";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Parcours" };

export default function TracksPage() {
  const progress = new Map(trackProgress().map((p) => [p.trackId, p]));

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
        {tracks.map((track) => {
          const p = progress.get(track.id);
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
