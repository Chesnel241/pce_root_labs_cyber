"use client";

import * as React from "react";
import { Check, Copy, GraduationCap, ListChecks, Target } from "lucide-react";
import { getGuide } from "@/lib/guides";
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

      {/* Guide pas à pas */}
      <section>
        <SectionLabel icon={ListChecks}>Guide pas à pas</SectionLabel>
        <ol className="mt-1 space-y-3">
          {guide.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{step.title}</p>
                <GlossaryText className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {step.detail}
                </GlossaryText>
                {step.command && <CommandBlock command={step.command} />}
              </div>
            </li>
          ))}
        </ol>
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
