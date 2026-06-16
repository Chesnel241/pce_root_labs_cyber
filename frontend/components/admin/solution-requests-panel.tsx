"use client";

import * as React from "react";
import { BookOpenCheck, Check, Loader2, RotateCw, X, ChevronDown, ChevronUp } from "lucide-react";
import { api, ApiError, type AdminSolutionRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getGuide } from "@/lib/guides";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Modération des demandes de corrigé (admin). L'admin approuve ou rejette ;
 * un élève dont la demande est approuvée voit alors le corrigé.
 */
export function SolutionRequestsPanel() {
  const { apiEnabled, user } = useAuth();
  const isAdmin = apiEnabled && user?.role === "admin";

  const [requests, setRequests] = React.useState<AdminSolutionRequest[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [actingId, setActingId] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const load = React.useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminSolutionRequests("pending");
      setRequests(res.requests);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: "approve" | "reject") {
    setActingId(id);
    try {
      await api.decideSolution(id, decision);
      setRequests((rs) => rs.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action impossible.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BookOpenCheck className="h-4 w-4 text-violet-500" />
          Demandes de corrigé
          {requests.length > 0 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              {requests.length} en attente
            </span>
          )}
        </CardTitle>
        {isAdmin && (
          <Button variant="ghost" size="icon" onClick={load} aria-label="Actualiser">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4" />
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-3">
        {!isAdmin ? (
          <p className="text-sm text-muted-foreground">
            La validation des corrigés sera disponible ici une fois connecté en
            tant qu'administrateur (API requise).
          </p>
        ) : loading && requests.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={BookOpenCheck}
            title="Aucune demande en attente"
            description="Les demandes de corrigé des élèves apparaîtront ici pour validation."
          />
        ) : (
          <ul className="divide-y divide-border">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-3 py-3 first:pt-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {r.username}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({r.email})
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Challenge {r.challengeId} — {r.challengeTitle} ·{" "}
                      {new Date(r.requestedAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleExpand(r.id)}
                    >
                      {expandedId === r.id ? "Masquer corrigé" : "Voir corrigé"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => decide(r.id, "reject")}
                      disabled={actingId === r.id}
                    >
                      <X className="h-4 w-4" />
                      Rejeter
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => decide(r.id, "approve")}
                      disabled={actingId === r.id}
                    >
                      {actingId === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approuver
                    </Button>
                  </div>
                </div>
                {expandedId === r.id && (
                  <div className="animate-fade-in mt-1 rounded-lg border border-border bg-surface-muted/50 p-4 text-sm">
                    {(() => {
                      const guide = getGuide(r.challengeId, "");
                      return (
                        <div className="space-y-4">
                          <div>
                            <strong className="block text-foreground">Objectif attendu</strong>
                            <p className="mt-1 text-muted-foreground">{guide.objective}</p>
                          </div>
                          <div>
                            <strong className="block text-foreground">Étapes de résolution</strong>
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
                )}
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
