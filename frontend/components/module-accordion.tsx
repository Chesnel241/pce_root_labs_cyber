"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Circle, Flag } from "lucide-react";
import { type Module } from "@/lib/curriculum";
import { difficultyMeta } from "@/lib/style-maps";
import { isSolved } from "@/lib/demo";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function ModuleAccordion({
  modules,
  accentBar,
}: {
  modules: Module[];
  accentBar: string;
}) {
  // First not-fully-completed module open by default.
  const firstOpen = modules.findIndex(
    (m) => m.challenges.some((c) => !isSolved(c.id)),
  );
  const [open, setOpen] = React.useState<string | null>(
    modules[firstOpen === -1 ? 0 : firstOpen]?.id ?? null,
  );

  return (
    <div className="space-y-3">
      {modules.map((module) => {
        const solved = module.challenges.filter((c) => isSolved(c.id)).length;
        const total = module.challenges.length;
        const percent = Math.round((solved / total) * 100);
        const isOpen = open === module.id;
        const meta = difficultyMeta[module.difficulty];

        return (
          <div
            key={module.id}
            className="overflow-hidden rounded-xl border border-border bg-surface shadow-card"
          >
            <button
              onClick={() => setOpen(isOpen ? null : module.id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-muted"
            >
              <span className="font-mono text-sm font-medium text-muted-foreground">
                {module.id}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{module.name}</span>
                  {percent === 100 && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {module.summary}
                </p>
              </div>
              <div className="hidden w-32 shrink-0 sm:block">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {solved}/{total}
                  </span>
                  <span>{percent}%</span>
                </div>
                <Progress value={percent} barClassName={accentBar} />
              </div>
              <Badge className={cn("shrink-0", meta.badge)}>{meta.label}</Badge>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                {module.xp} XP
              </span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            </button>

            {isOpen && (
              <ul className="divide-y divide-border border-t border-border">
                {module.challenges.map((challenge) => {
                  const solvedChallenge = isSolved(challenge.id);
                  return (
                    <li key={challenge.id}>
                      <Link
                        href={`/challenges/${challenge.id}`}
                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-muted"
                      >
                        {solvedChallenge ? (
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
            )}
          </div>
        );
      })}
    </div>
  );
}
