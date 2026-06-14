"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Server,
  Flag,
  CheckCircle2,
  Search,
  SearchX,
  Circle,
} from "lucide-react";
import { tracks, totals, allChallenges } from "@/lib/curriculum";
import { currentUser, leaderboard } from "@/lib/demo";
import { difficultyMeta } from "@/lib/style-maps";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Données de démonstration (admin)                                    */
/* ------------------------------------------------------------------ */

type Status = "active" | "idle" | "suspended";

interface AdminUser {
  username: string;
  email: string;
  xp: number;
  rank: number;
  joined: string;
  status: Status;
}

const statusMeta: Record<Status, { label: string; badge: string }> = {
  active: {
    label: "Actif",
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
  },
  idle: {
    label: "Inactif",
    badge:
      "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/20",
  },
  suspended: {
    label: "Suspendu",
    badge:
      "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
  },
};

// Construit des lignes crédibles à partir du classement de démo.
const joinDates = [
  "2025-11-03",
  "2025-12-12",
  "2026-01-08",
  "2026-01-22",
  "2026-02-01",
  "2026-02-14",
  "2026-03-09",
  "2026-04-02",
];
const statuses: Status[] = [
  "active",
  "active",
  "idle",
  "active",
  "suspended",
  "active",
  "idle",
  "active",
];

const adminUsers: AdminUser[] = leaderboard.map((row, i) => ({
  username: row.username,
  email: row.isCurrentUser
    ? currentUser.email
    : `${row.username.replace(/[^a-z0-9]/gi, ".").toLowerCase()}@pce-labs.io`,
  xp: row.xp,
  rank: row.rank,
  joined: joinDates[i % joinDates.length],
  status: statuses[i % statuses.length],
}));

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const labsCount = allChallenges().filter(({ challenge }) => challenge.lab)
  .length;

export default function AdminPage() {
  const [query, setQuery] = React.useState("");

  const filteredUsers = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return adminUsers;
    return adminUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration"
        description="Vue d'ensemble en lecture seule de la plateforme : utilisateurs, labs et contenu pédagogique."
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Utilisateurs"
          value={formatNumber(adminUsers.length)}
          icon={Users}
          hint="comptes enregistrés"
        />
        <StatCard
          label="Labs disponibles"
          value={formatNumber(labsCount)}
          icon={Server}
          iconClassName="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
          hint="environnements provisionnables"
        />
        <StatCard
          label="Challenges"
          value={formatNumber(totals.challenges)}
          icon={Flag}
          iconClassName="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
          hint={`${totals.modules} modules · ${totals.tracks} parcours`}
        />
        <StatCard
          label="Soumissions du jour"
          value={formatNumber(142)}
          icon={CheckCircle2}
          iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          trend={{ value: "+18%", positive: true }}
          hint="vs hier"
        />
      </div>

      {/* Users table */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Utilisateurs
            </h2>
            <p className="text-sm text-muted-foreground">
              {filteredUsers.length} sur {adminUsers.length} comptes
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un utilisateur…"
              aria-label="Rechercher un utilisateur"
              className="h-9 w-full rounded-lg border border-border bg-surface-muted pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:bg-surface focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Aucun utilisateur trouvé"
            description={`Aucun compte ne correspond à « ${query.trim()} ». Essayez un autre terme.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Utilisateur</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 text-right font-medium">XP</th>
                  <th className="px-5 py-3 text-right font-medium">Rang</th>
                  <th className="px-5 py-3 font-medium">Inscrit le</th>
                  <th className="px-5 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const meta = statusMeta[u.status];
                  return (
                    <tr
                      key={u.username}
                      className="border-b border-border transition-colors last:border-0 hover:bg-surface-muted"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                            {u.username.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="font-medium">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {u.email}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold">
                        {formatNumber(u.xp)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                        #{u.rank}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {formatDate(u.joined)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge className={meta.badge}>{meta.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Challenges / labs table */}
      <Card className="overflow-hidden">
        <div className="border-b border-border p-5">
          <h2 className="text-base font-semibold tracking-tight">
            Challenges &amp; labs
          </h2>
          <p className="text-sm text-muted-foreground">
            Contenu pédagogique dérivé du curriculum.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">ID</th>
                <th className="px-5 py-3 font-medium">Challenge</th>
                <th className="px-5 py-3 font-medium">Parcours</th>
                <th className="px-5 py-3 font-medium">Difficulté</th>
                <th className="px-5 py-3 font-medium">Lab</th>
                <th className="px-5 py-3 text-right font-medium">Points</th>
              </tr>
            </thead>
            <tbody>
              {tracks.flatMap((track) =>
                track.modules.flatMap((module) =>
                  module.challenges.map((challenge) => {
                    const meta = difficultyMeta[module.difficulty];
                    return (
                      <tr
                        key={challenge.id}
                        className="border-b border-border transition-colors last:border-0 hover:bg-surface-muted"
                      >
                        <td className="px-5 py-3">
                          <Link
                            href={`/challenges/${challenge.id}`}
                            className="rounded font-mono text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                          >
                            {challenge.id}
                          </Link>
                        </td>
                        <td className="max-w-xs px-5 py-3">
                          <span className="block truncate font-medium">
                            {challenge.title}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {track.name}
                        </td>
                        <td className="px-5 py-3">
                          <Badge className={meta.badge}>{meta.label}</Badge>
                        </td>
                        <td className="px-5 py-3">
                          {challenge.lab ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs font-medium">Oui</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-muted-foreground/60">
                              <Circle className="h-4 w-4" />
                              <span className="text-xs font-medium">Non</span>
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold">
                          +{challenge.points}
                        </td>
                      </tr>
                    );
                  }),
                ),
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
