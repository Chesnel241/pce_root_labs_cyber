"use client";

import * as React from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  GraduationCap,
  ListChecks,
  Target,
} from "lucide-react";
import { getGuide } from "@/lib/guides";
import { Button } from "@/components/ui/button";
import { GlossaryText } from "./glossary-text";
import { cn } from "@/lib/utils";

/**
 * Consignes structurées et guidées pour débutants : contexte, objectif,
 * notions cliquables (glossaire) et pas-à-pas. Conçu pour APPRENDRE.
 */
export function GuidedInstructions({
  challengeId,
  description,
}: {
  challengeId: string;
  description: string;
}) {
  const guide = React.useMemo(
    () => getGuide(challengeId, description),
    [challengeId, description],
  );
  // Étape courante du guide affiché en « cartes swap » (une seule à la fois).
  const [step, setStep] = React.useState(0);
  React.useEffect(() => setStep(0), [challengeId]);
  const cur = guide.steps[Math.min(step, guide.steps.length - 1)];
  const lastStep = guide.steps.length - 1;

  return (
    <div className="space-y-5">
      {/* Contexte */}
      <section>
        <SectionLabel icon={GraduationCap}>Contexte</SectionLabel>
        <GlossaryText className="text-sm leading-relaxed text-muted-foreground">
          {guide.context}
        </GlossaryText>
      </section>

      {/* Objectif */}
      <section className="rounded-lg border border-primary/20 bg-primary-soft/60 p-3">
        <SectionLabel icon={Target} className="text-primary">
          Objectif
        </SectionLabel>
        <GlossaryText className="text-sm leading-relaxed text-foreground/90">
          {guide.objective}
        </GlossaryText>
      </section>

      {/* Notions */}
      {guide.concepts.length > 0 && (
        <section>
          <SectionLabel>Notions à connaître</SectionLabel>
          <p className="mb-2 text-xs text-muted-foreground">
            Cliquez sur un terme pour son explication.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {guide.concepts.map((c) => (
              <span
                key={c}
                className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs"
              >
                <GlossaryText as="span">{c}</GlossaryText>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Guide pas à pas — en cartes « swap » (une étape à la fois) */}
      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <SectionLabel icon={ListChecks}>Guide pas à pas</SectionLabel>
          <span className="text-xs font-medium text-muted-foreground">
            Étape {step + 1}/{guide.steps.length}
          </span>
        </div>

        <div
          key={step}
          className="animate-pop-in min-h-[120px] rounded-xl border border-border bg-surface-muted/40 p-3.5"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {step + 1}
            </span>
            <p className="text-sm font-semibold">{cur.title}</p>
          </div>
          <GlossaryText className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {cur.detail}
          </GlossaryText>
          {cur.command && <CommandBlock command={cur.command} />}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>

          <div className="flex items-center gap-1.5">
            {guide.steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Aller à l'étape ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step
                    ? "w-5 bg-primary"
                    : "w-1.5 bg-border hover:bg-muted-foreground/40",
                )}
              />
            ))}
          </div>

          {step < lastStep ? (
            <Button size="sm" onClick={() => setStep((s) => Math.min(lastStep, s + 1))}>
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              Fin du guide
            </span>
          )}
        </div>
      </section>

      {/* Format du flag */}
      <div className="rounded-lg bg-surface-muted p-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Format du flag :</span>{" "}
        <code className="font-mono">PCE{"{...}"}</code> — collez-le dans
        « Soumettre le flag » une fois trouvé.
      </div>
    </div>
  );
}

function SectionLabel({
  children,
  icon: Icon,
  className,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </h3>
  );
}

function CommandBlock({ command }: { command: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponible */
    }
  };
  return (
    <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-[#0F172A] px-2.5 py-1.5">
      <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-slate-200">
        {command}
      </code>
      <button
        onClick={copy}
        className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100"
        aria-label="Copier la commande"
        title="Copier"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
