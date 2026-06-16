"use client";

import * as React from "react";
import {
  BookOpenCheck,
  Clock,
  KeyRound,
  Loader2,
  Lock,
  RotateCw,
  XCircle,
} from "lucide-react";
import { api, ApiError, type SolutionStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getGuide } from "@/lib/guides";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Demande de corrigé soumise à validation d'un formateur (admin).
 * - L'élève demande → statut « en attente ».
 * - L'admin valide dans l'espace d'administration.
 * - Une fois approuvé, le corrigé (flag + renvoi vers le guide) s'affiche.
 */
export function SolutionPanel({
  challengeId,
}: {
  challengeId: string;
}) {
  const { apiEnabled, isAuthenticated, token } = useAuth();
  const live = apiEnabled && isAuthenticated && Boolean(token);

  const [status, setStatus] = React.useState<SolutionStatus>("none");
  const [flag, setFlag] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!live) return;
    setLoading(true);
    try {
      const res = await api.getSolution(challengeId);
      setStatus(res.status);
      setFlag(res.flag ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }, [challengeId, live]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  // Tant que la demande est en attente, on vérifie périodiquement l'approbation.
  React.useEffect(() => {
    if (!live || status !== "pending") return;
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [live, status, refresh]);

  async function request() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.requestSolution(challengeId);
      setStatus(res.status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Demande impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpenCheck className="h-4 w-4 text-violet-500" />
          Corrigé
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        {!live ? (
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour pouvoir demander le corrigé à un formateur.
          </p>
        ) : status === "approved" ? (
          <div className="animate-pop-in space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <BookOpenCheck className="h-4 w-4" />
              Corrigé débloqué
            </div>
            
            <div className="rounded-lg border border-border bg-surface-muted/50 p-4 text-sm">
              {(() => {
                const guide = getGuide(challengeId, "");
                return (
                  <div className="space-y-4">
                    <div>
                      <strong className="block text-foreground">Objectif attendu</strong>
                      <p className="mt-1 text-muted-foreground">{guide.objective}</p>
                    </div>
                    <div>
                      <strong className="block text-foreground">Explication de la correction</strong>
                      <ol className="mt-2 list-decimal space-y-3 pl-4 text-muted-foreground">
                        {guide.steps.map((step, idx) => (
                          <li key={idx} className="pl-1">
                            <span className="font-medium text-foreground">{step.title}</span>
                            <p className="mt-0.5">{step.detail}</p>
                            {step.command && (
                              <code className="mt-1.5 block overflow-x-auto rounded-md bg-[#0F172A] px-3 py-2 font-mono text-xs text-emerald-300">
                                {step.command}
                              </code>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <KeyRound className="h-3.5 w-3.5" /> Flag de la solution
              </p>
              <code className="block overflow-x-auto rounded-lg bg-[#0F172A] px-3 py-2 font-mono text-sm text-emerald-300">
                {flag ?? "—"}
              </code>
            </div>
          </div>
        ) : status === "pending" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              <Clock className="h-4 w-4" />
              Demande envoyée — en attente de validation par un formateur.
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4" />
              )}
              Vérifier
            </Button>
          </div>
        ) : status === "rejected" ? (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
            <XCircle className="h-4 w-4" />
            Demande refusée. Continuez avec les indices et le guide, ou
            sollicitez votre formateur.
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-sm text-muted-foreground">
              Bloqué malgré les indices ? Vous pouvez demander le corrigé. Un
              formateur devra l'approuver avant qu'il ne s'affiche.
            </p>
            <Button size="sm" variant="secondary" onClick={request} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              Demander le corrigé
            </Button>
          </div>
        )}
        {error && (
          <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
