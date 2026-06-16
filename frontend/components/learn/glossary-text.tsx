"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { BookOpen, X } from "lucide-react";
import {
  tokenizeWithGlossary,
  type GlossaryEntry,
} from "@/lib/glossary";

interface ActivePopover {
  entry: GlossaryEntry;
  rect: DOMRect;
}

/**
 * Affiche un texte dont les termes connus du glossaire deviennent cliquables.
 * Un clic ouvre une pop-up animée expliquant la notion / la commande.
 */
export function GlossaryText({
  children,
  className,
  as: Tag = "p",
}: {
  children: string;
  className?: string;
  as?: "p" | "span" | "div";
}) {
  const [active, setActive] = React.useState<ActivePopover | null>(null);
  const segments = React.useMemo(
    () => tokenizeWithGlossary(children),
    [children],
  );

  return (
    <>
      <Tag className={className}>
        {segments.map((seg, i) =>
          seg.type === "text" ? (
            <React.Fragment key={i}>{seg.value}</React.Fragment>
          ) : (
            <button
              key={i}
              type="button"
              className="glossary-term"
              onClick={(e) =>
                setActive({
                  entry: seg.entry,
                  rect: e.currentTarget.getBoundingClientRect(),
                })
              }
              aria-label={`Définition : ${seg.entry.term}`}
            >
              {seg.value}
            </button>
          ),
        )}
      </Tag>
      {active && (
        <GlossaryPopover entry={active.entry} rect={active.rect} onClose={() => setActive(null)} />
      )}
    </>
  );
}

function GlossaryPopover({
  entry,
  rect,
  onClose,
}: {
  entry: GlossaryEntry;
  rect: DOMRect;
  onClose: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Fermer au scroll (la pop-up est en position fixe, l'ancre bouge).
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  if (!mounted) return null;

  const width = 340;
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.min(Math.max(margin, rect.left), vw - width - margin);
  const below = rect.bottom + 10;
  const openUp = below > vh - 180;
  const style: React.CSSProperties = {
    position: "fixed",
    left,
    width,
    ...(openUp
      ? { bottom: vh - rect.top + 10 }
      : { top: below }),
    zIndex: 70,
  };

  return createPortal(
    <>
      <button
        aria-label="Fermer"
        onClick={onClose}
        className="fixed inset-0 z-[69] cursor-default bg-transparent"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-label={`Définition de ${entry.term}`}
        style={style}
        className="animate-pop-in rounded-xl border border-border bg-surface p-4 shadow-card-hover"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <BookOpen className="h-4 w-4" />
            </span>
            <h4 className="font-semibold leading-tight">{entry.term}</h4>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm font-medium text-foreground">{entry.short}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {entry.long}
        </p>
        {entry.example && (
          <pre className="mt-2.5 overflow-x-auto rounded-lg bg-[#0F172A] p-2.5 font-mono text-xs text-slate-200">
            {entry.example}
          </pre>
        )}
      </div>
    </>,
    document.body,
  );
}
