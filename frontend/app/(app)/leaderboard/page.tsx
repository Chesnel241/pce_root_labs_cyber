import { Crown, Medal, Zap } from "lucide-react";
import { leaderboard } from "@/lib/demo";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";

export const metadata = { title: "Classement" };

export default function LeaderboardPage() {
  const podium = leaderboard.slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classement"
        description="Les meilleurs analystes du cyber range, classés par expérience accumulée."
      />

      {/* Podium */}
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

      {/* Table */}
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
            {leaderboard.map((row) => (
              <tr
                key={row.rank}
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
