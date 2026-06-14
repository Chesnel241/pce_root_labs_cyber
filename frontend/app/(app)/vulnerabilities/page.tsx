"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";
import { vulnerabilities } from "@/lib/curriculum";
import { severityMeta } from "@/lib/style-maps";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const categories = [
  { id: "all", label: "Toutes" },
  { id: "iam", label: "IAM" },
  { id: "storage", label: "Stockage" },
  { id: "network", label: "Réseau" },
  { id: "container", label: "Container" },
  { id: "cicd", label: "CI/CD" },
  { id: "crypto", label: "Chiffrement" },
];

export default function VulnerabilitiesPage() {
  const [filter, setFilter] = React.useState("all");
  const list = vulnerabilities.filter(
    (v) => filter === "all" || v.category === filter,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalogue de vulnérabilités"
        description="Les failles simulées dans les labs, classées par catégorie et niveau de criticité."
      />

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              filter === c.id
                ? "border-primary bg-primary-soft text-primary"
                : "border-border text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((v) => {
          const sev = severityMeta[v.severity];
          return (
            <Card key={v.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-muted text-muted-foreground">
                    <ShieldAlert className="h-5 w-5" />
                  </span>
                  <Badge className={sev.badge}>{sev.label}</Badge>
                </div>
                <h3 className="mt-3 font-semibold tracking-tight">{v.name}</h3>
                <p className="mt-1.5 flex-1 text-sm text-muted-foreground">
                  {v.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {v.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-surface-muted px-2 py-0.5 font-mono text-xs text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
