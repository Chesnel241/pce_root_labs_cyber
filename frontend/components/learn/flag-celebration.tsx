"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { PartyPopper, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Célébration animée à la validation d'un flag : confettis (canvas, sans
 * dépendance) + modale de félicitations. Renforce le côté ludique/gratifiant.
 */
export function FlagCelebration({
  points,
  message,
  onClose,
}: {
  points: number;
  message?: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Confettis maison (canvas + requestAnimationFrame).
  React.useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = ["#4F46E5", "#22D3EE", "#34D399", "#FBBF24", "#FB7185", "#A78BFA"];
    const parts = Array.from({ length: 150 }, () => ({
      x: (window.innerWidth / 2) * dpr,
      y: window.innerHeight * 0.32 * dpr,
      vx: (Math.random() - 0.5) * 16 * dpr,
      vy: (Math.random() * -13 - 4) * dpr,
      size: (Math.random() * 6 + 4) * dpr,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
    }));

    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const alpha = Math.max(0, 1 - elapsed / 2200);
      for (const p of parts) {
        p.vy += 0.35 * dpr;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.globalAlpha = alpha;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (elapsed < 2400) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 animate-backdrop bg-slate-950/50 backdrop-blur-sm"
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ width: "100%", height: "100%" }}
      />
      <div
        role="dialog"
        aria-label="Flag validé"
        className="animate-celebrate relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-card-hover"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <PartyPopper className="h-8 w-8" />
        </div>
        <h2 className="mt-4 flex items-center justify-center gap-2 text-xl font-bold tracking-tight">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Flag validé !
        </h2>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
          <Zap className="h-4 w-4" />+{points} XP
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {message ?? "Bravo ! Vous avez exploité la faille et capturé le flag. C'est exactement ça, apprendre la cybersécurité. 🎯"}
        </p>
        <div className="mt-5 flex w-full flex-col gap-2">
          <Link href="/tracks" className="w-full">
            <Button size="lg" className="w-full">
              Retour aux parcours
            </Button>
          </Link>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Fermer et rester sur la page
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
