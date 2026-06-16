"use client";

import * as React from "react";
import Link from "next/link";
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
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useChallenge } from "@/lib/use-platform-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LabTerminal } from "./lab-terminal";
import { GuidedInstructions } from "@/components/learn/guided-instructions";
import { GlossaryText } from "@/components/learn/glossary-text";
import { FlagCelebration } from "@/components/learn/flag-celebration";
import { SolutionPanel } from "@/components/learn/solution-panel";
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
  const { token, apiEnabled, isAuthenticated } = useAuth();
  // Mode live possible pour les actions (lab/flag) : API + utilisateur connecté.
  const liveActions = apiEnabled && isAuthenticated && Boolean(token);

  const [status, setStatus] = React.useState<LabStatus>("idle");
  const [elapsed, setElapsed] = React.useState(0);
  const [revealed, setRevealed] = React.useState(0);
  const [flag, setFlag] = React.useState("");
  const [result, setResult] = React.useState<null | "correct" | "wrong">(
    props.solved ? "correct" : null,
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [resultMessage, setResultMessage] = React.useState<string | null>(
    props.solved ? `+${props.points} XP — challenge déjà résolu.` : null,
  );
  const [labError, setLabError] = React.useState<string | null>(null);
  // Session de lab réelle. null en mode démo.
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  // Clé de remontage du terminal (utilisée par Reset).
  const [termKey, setTermKey] = React.useState(0);
  // Célébration animée (confettis) à la résolution.
  const [celebrate, setCelebrate] = React.useState(false);
  const [celebrateXp, setCelebrateXp] = React.useState(props.points);

  const meta = difficultyMeta[props.difficulty];

  // Hydratation du statut "résolu" depuis l'API quand disponible (sans écraser
  // un résultat de soumission déjà obtenu côté client).
  const liveChallenge = useChallenge(props.challengeId);
  React.useEffect(() => {
    if (liveChallenge.data?.solved && result === null) {
      setResult("correct");
      setResultMessage(`+${props.points} XP — challenge déjà résolu.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveChallenge.data]);

  React.useEffect(() => {
    if (status !== "running") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  async function startLab() {
    setLabError(null);
    setStatus("starting");

    if (liveActions) {
      try {
        const session = await api.startLab(props.challengeId);
        setSessionId(session.sessionId);
        setStatus("running");
        return;
      } catch (err) {
        setSessionId(null);
        setLabError(
          err instanceof ApiError
            ? `Erreur de l'API : ${err.message}`
            : "Impossible de démarrer le lab.",
        );
        setStatus("idle");
        return;
      }
    }

    setSessionId(null);
    setLabError("L'orchestration des labs est actuellement indisponible.");
    setStatus("idle");
  }

  function stopLab() {
    // Arrêt côté backend si une session réelle existe (best-effort).
    if (sessionId && liveActions) {
      api.stopLab(sessionId).catch(() => {});
    }
    setStatus("idle");
    setElapsed(0);
    setSessionId(null);
    setLabError(null);
  }

  function revealHint(index: number) {
    setRevealed((r) => Math.max(r, index + 1));
    // Suivi serveur (révélations / pénalité) en best-effort : on ignore l'échec
    // pour ne pas dégrader l'UX de révélation locale.
    if (liveActions) {
      api.submitHint(props.challengeId, index).catch(() => {});
    }
  }

  function resetLab() {
    // Reset : on relance proprement la session/terminal.
    if (sessionId && liveActions) {
      api.stopLab(sessionId).catch(() => {});
    }
    setSessionId(null);
    setElapsed(0);
    setTermKey((k) => k + 1);
    void startLab();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = flag.trim();
    if (!value || submitting) return;

    if (liveActions) {
      setSubmitting(true);
      try {
        const res = await api.submitFlag(props.challengeId, value);
        if (res.correct) {
          setResult("correct");
          setResultMessage(
            res.alreadySolved
              ? "Flag correct — challenge déjà résolu."
              : `Flag correct ! +${res.awardedPoints} XP (total ${res.totalXp}).`,
          );
          if (!res.alreadySolved) {
            setCelebrateXp(res.awardedPoints);
            setCelebrate(true);
          }
        } else {
          setResult("wrong");
          setResultMessage(null);
        }
      } catch (err) {
        setResult("wrong");
        setResultMessage(
          err instanceof ApiError
            ? `Soumission impossible : ${err.message}`
            : "Soumission impossible. Réessayez.",
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setResult("wrong");
    setResultMessage("Le système de validation est indisponible.");
  }

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(
    elapsed % 60,
  ).padStart(2, "0")}`;

  return (
    <>
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
          <CardContent className="pt-3">
            <GuidedInstructions
              challengeId={props.challengeId}
              description={props.description}
            />
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
                    <GlossaryText className="text-muted-foreground">
                      {hint}
                    </GlossaryText>
                  ) : (
                    <button
                      onClick={() => revealHint(i)}
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

        <SolutionPanel challengeId={props.challengeId} />
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
                  <Button size="sm" variant="outline" onClick={resetLab}>
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

          {labError && (
            <div className="border-b border-border bg-red-50 px-5 py-2 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
              {labError}
            </div>
          )}

          <div className="h-[420px] p-4">
            {status === "running" ? (
              <LabTerminal
                key={termKey}
                challengeId={props.challengeId}
                labSlug={props.labSlug}
                sessionId={sessionId}
                token={token}
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
                    if (result === "wrong") {
                      setResult(null);
                      setResultMessage(null);
                    }
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
              <Button
                type="submit"
                size="lg"
                className="sm:w-auto"
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Soumettre le flag
              </Button>
            </form>

            {result === "correct" && (
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  {resultMessage ??
                    `Flag correct ! +${props.points} XP ajoutés à votre score.`}
                </div>
                <Link href="/tracks" className="sm:w-fit">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Retour aux parcours
                  </Button>
                </Link>
              </div>
            )}
            {result === "wrong" && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                <CircleDot className="h-4 w-4" />
                {resultMessage ??
                  "Flag incorrect. Vérifiez le format et réessayez."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>

      {celebrate && (
        <FlagCelebration
          points={celebrateXp}
          message={resultMessage ?? undefined}
          onClose={() => setCelebrate(false)}
        />
      )}
    </>
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
