import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getChallengeContext, allChallenges } from "@/lib/curriculum";
import { getHints } from "@/lib/hints";
import { isSolved } from "@/lib/demo";
import { ChallengeWorkspace } from "@/components/challenge/challenge-workspace";

export function generateStaticParams() {
  return allChallenges().map(({ challenge }) => ({
    challengeId: challenge.id,
  }));
}

export function generateMetadata({
  params,
}: {
  params: { challengeId: string };
}) {
  const ctx = getChallengeContext(params.challengeId);
  return { title: ctx?.challenge.title ?? "Challenge" };
}

export default function ChallengePage({
  params,
}: {
  params: { challengeId: string };
}) {
  const ctx = getChallengeContext(params.challengeId);
  if (!ctx) notFound();

  const { challenge, module, track } = ctx;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href="/tracks" className="hover:text-foreground">
          Parcours
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/tracks/${track.id}`}
          className="hover:text-foreground"
        >
          {track.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">
          Module {module.id} — {module.name}
        </span>
      </nav>

      <div>
        <p className="font-mono text-xs font-medium text-muted-foreground">
          Challenge {challenge.id}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {challenge.title}
        </h1>
      </div>

      <ChallengeWorkspace
        challengeId={challenge.id}
        title={challenge.title}
        description={challenge.description}
        points={challenge.points}
        difficulty={module.difficulty}
        hints={getHints(challenge.id)}
        hasLab={Boolean(challenge.lab)}
        labSlug={challenge.lab}
        solved={isSolved(challenge.id)}
      />
    </div>
  );
}
