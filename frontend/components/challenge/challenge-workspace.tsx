"use client";

import * as React from "react";
import {
  CheckCircle2,
  CircleDot,
  Flag,
  Lightbulb,
  Loader2,
  Play,
  RotateCcw,
  Square,
  Terminal as TerminalIcon,
} from "lucide-react";
import { type Difficulty } from "@/lib/curriculum";
import { difficultyMeta } from "@/lib/style-maps";
import { expectedFlag } from "@/lib/hints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LabTerminal } from "./lab-terminal";
import { cn } from "@/lib/utils";

type LabStatus = "idle" | "starting" | "running";

export interface ChallengeWorkspaceProps {
  challengeId: string;
  title: string;
  description: string;
  points: number;
  difficulty: Difficulty;
  hints: string[];
  hasLab: boolean;
  labSlug?: string;
  solved: boolean;
}

export function ChallengeWorkspace(props: ChallengeWorkspaceProps) {
  const [status, setStatus] = React.useState<LabStatus>("idle");
  const [elapsed, setElapsed] = React.useState(0);
  const [revealed, setRevealed] = React.useState(0);
  const [flag, setFlag] = React.useState("");
  const [result, setResult] = React.useState<null | "correct" | "wrong">(
    props.solved ? "correct" : null,
  );
  const meta = difficultyMeta[props.difficulty];

  React.useEffect(() => {
    if (status !== "running") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  function startLab() {
    setStatus("starting");
    // Démo : démarrage immédiat. Avec le backend, appeler api.startLab().
    setTimeout(() => setStatus("running"), 700);
  }

  function stopLab() {
    setStatus("idle");
    setElapsed(0);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!flag.trim()) return;
    const ok =
      flag.trim().toLowerCase() ===
      expectedFlag(props.challengeId).toLowerCase();
    setResult(ok ? "correct" : "wrong");
  }

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(
    elapsed % 60,
  ).padStart(2, "0")}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* Instructions */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge className={meta.badge}>{meta.label}</Badge>
              <Badge className="bg-primary-soft text-primary ring-primary/15">
                +{props.points} XP
              </Badge>
              {result === "correct" && (
                <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20">
                  <CheckCircle2 className="h-3 w-3" /> Résolu
                </Badge>
              )}
            </div>
            <CardTitle className="mt-2 text-lg">{props.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-3">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {props.description}
            </p>
            <div className="rounded-lg bg-surface-muted p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                Format du flag :
              </span>{" "}
              <code className="font-mono">PCE{"{...}"}</code>
            </div>
          </CardContent>
        </Card>

        {/* Hints */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Indices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-3">
            {props.hints.map((hint, i) => {
              const open = i < revealed;
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-surface-muted/50 p-3 text-sm"
                >
                  {open ? (
                    <p className="text-muted-foreground">{hint}</p>
                  ) : (
                    <button
                      onClick={() => setRevealed((r) => Math.max(r, i + 1))}
                      disabled={i > revealed}
                      className="flex w-full items-center justify-between text-left font-medium text-foreground disabled:opacity-40"
                    >
                      <span>Indice {i + 1}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        révéler
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Workspace */}
      <div className="space-y-6">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TerminalIcon className="h-4 w-4 text-muted-foreground" />
              Terminal du lab
              <LabStatusPill status={status} />
            </div>
            <div className="flex items-center gap-2">
              {status === "running" && (
                <span className="font-mono text-sm tabular-nums text-muted-foreground">
                  {mmss}
                </span>
              )}
              {status === "idle" && (
                <Button size="sm" onClick={startLab}>
                  <Play className="h-4 w-4" />
                  Démarrer le lab
                </Button>
              )}
              {status === "starting" && (
                <Button size="sm" disabled>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Démarrage…
                </Button>
              )}
              {status === "running" && (
                <>
                  <Button size="sm" variant="outline" onClick={startLab}>
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                  <Button size="sm" variant="danger" onClick={stopLab}>
                    <Square className="h-4 w-4" />
                    Arrêter
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="h-[420px] p-4">
            {status === "running" ? (
              <LabTerminal
                challengeId={props.challengeId}
                labSlug={props.labSlug}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted/40 text-center">
                <TerminalIcon className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">
                  {status === "starting"
                    ? "Provisionnement du conteneur…"
                    : "Le lab n'est pas démarré"}
                </p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Démarrez le lab pour ouvrir un terminal isolé et commencer le
                  challenge.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Flag submission */}
        <Card>
          <CardContent>
            <form
              onSubmit={submit}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <div className="relative flex-1">
                <Flag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={flag}
                  onChange={(e) => {
                    setFlag(e.target.value);
                    if (result === "wrong") setResult(null);
                  }}
                  placeholder="PCE{votre_flag_ici}"
                  className={cn(
                    "h-11 w-full rounded-lg border bg-surface pl-9 pr-3 font-mono text-sm outline-none transition-colors focus:ring-2 focus:ring-ring/30",
                    result === "wrong"
                      ? "border-rose-400 focus:border-rose-400"
                      : "border-border focus:border-primary/40",
                  )}
                />
              </div>
              <Button type="submit" size="lg" className="sm:w-auto">
                Soumettre le flag
              </Button>
            </form>

            {result === "correct" && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Flag correct ! +{props.points} XP ajoutés à votre score.
              </div>
            )}
            {result === "wrong" && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                <CircleDot className="h-4 w-4" />
                Flag incorrect. Vérifiez le format et réessayez.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LabStatusPill({ status }: { status: LabStatus }) {
  const map = {
    idle: { label: "Arrêté", cls: "bg-muted text-muted-foreground" },
    starting: {
      label: "Démarrage",
      cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    },
    running: {
      label: "En cours",
      cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    },
  } as const;
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        s.cls,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "running"
            ? "bg-emerald-500"
            : status === "starting"
              ? "bg-amber-500"
              : "bg-muted-foreground/50",
        )}
      />
      {s.label}
    </span>
  );
}
