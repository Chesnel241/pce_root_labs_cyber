"use client";

import * as React from "react";
import { marked } from "marked";
import {
  Columns2,
  Eye,
  FileText,
  Pencil,
  Printer,
  RotateCcw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Modèle de rapport de pentest pré-rempli (français)                  */
/* ------------------------------------------------------------------ */

const REPORT_TEMPLATE = `# Rapport de test d'intrusion

**Client :** Acme Corp
**Périmètre :** Application web \`app.acme.example\` + infrastructure cloud associée
**Type de test :** Boîte grise (grey-box)
**Auteur :** chesnel241 — Analyste Sécurité Cloud
**Date :** ${new Date().toLocaleDateString("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})}
**Version :** 1.0

---

## 1. Synthèse exécutive

Le test d'intrusion a permis d'identifier **plusieurs vulnérabilités** dont
**1 critique** et **2 élevées** susceptibles de compromettre la confidentialité
des données clients. Une remédiation prioritaire est recommandée sous 30 jours.

| Sévérité | Nombre |
| --- | --- |
| Critique | 1 |
| Élevée | 2 |
| Moyenne | 3 |
| Faible | 4 |

---

## 2. Contexte & objectifs

- **Objectif :** évaluer la résistance de l'application et de son infrastructure
  cloud face à un attaquant disposant d'un compte utilisateur standard.
- **Période d'exécution :** du JJ/MM/AAAA au JJ/MM/AAAA.
- **Contraintes :** test réalisé en environnement de pré-production, hors heures
  de pointe, sans déni de service.

---

## 3. Méthodologie

Le test suit une approche structurée alignée sur l'**OWASP Testing Guide** et le
référentiel **MITRE ATT&CK** :

1. **Reconnaissance** — collecte d'informations, énumération des services.
2. **Cartographie** — analyse de la surface d'attaque et des points d'entrée.
3. **Exploitation** — validation des vulnérabilités identifiées.
4. **Post-exploitation** — évaluation de l'impact et de la latéralisation.
5. **Reporting** — qualification du risque et recommandations.

---

## 4. Constats (findings)

### 4.1 — Injection SQL sur le point de connexion

- **Sévérité :** \`Critique\`
- **CVSS :** 9.1 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N)
- **Composant :** \`POST /api/login\`

**Description.** Le paramètre \`email\` n'est pas correctement assaini, permettant
l'injection de requêtes SQL arbitraires et l'extraction de la base utilisateurs.

**Preuve de concept.**

\`\`\`http
POST /api/login HTTP/1.1
Content-Type: application/json

{"email": "' OR '1'='1' -- ", "password": "x"}
\`\`\`

**Impact.** Compromission totale de la base de données (exfiltration, altération).

**Remédiation.**
- Utiliser des requêtes paramétrées / ORM avec liaison de paramètres.
- Appliquer une validation stricte des entrées côté serveur.

---

### 4.2 — Bucket S3 exposé publiquement

- **Sévérité :** \`Élevée\`
- **Composant :** \`s3://acme-prod-backups\`

**Description.** Le bucket de sauvegarde autorise la lecture anonyme.

**Remédiation.** Activer *Block Public Access*, restreindre via une *bucket policy*
au principe du moindre privilège.

---

## 5. Tableau de synthèse des vulnérabilités

| ID | Vulnérabilité | Sévérité | Statut |
| --- | --- | --- | --- |
| F-01 | Injection SQL (login) | Critique | À corriger |
| F-02 | Bucket S3 public | Élevée | À corriger |
| F-03 | En-têtes de sécurité manquants | Moyenne | À corriger |

---

## 6. Plan de remédiation

| Priorité | Action | Échéance |
| --- | --- | --- |
| P1 | Corriger l'injection SQL | 7 jours |
| P2 | Restreindre l'accès au bucket S3 | 15 jours |
| P3 | Durcir les en-têtes HTTP | 30 jours |

---

## 7. Conclusion

Le niveau de risque global est jugé **élevé**. La correction des vulnérabilités
critiques et élevées permettra de ramener le risque résiduel à un niveau
acceptable. Un test de validation (*re-test*) est recommandé après remédiation.

> _Rapport généré avec PCE Root Labs Cyber._
`;

type ViewMode = "split" | "edit" | "preview";

// Configuration marked : sauts de ligne GitHub-like, pas de HTML brut dangereux.
marked.setOptions({ gfm: true, breaks: true });

export default function ReportsPage() {
  const [markdown, setMarkdown] = React.useState<string>(REPORT_TEMPLATE);
  const [view, setView] = React.useState<ViewMode>("split");

  const html = React.useMemo(() => {
    try {
      return marked.parse(markdown, { async: false }) as string;
    } catch {
      return "<p>Erreur de rendu du Markdown.</p>";
    }
  }, [markdown]);

  function handlePrint() {
    window.print();
  }

  function handleReset() {
    if (
      window.confirm(
        "Réinitialiser le rapport avec le modèle par défaut ? Vos modifications seront perdues.",
      )
    ) {
      setMarkdown(REPORT_TEMPLATE);
    }
  }

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title="Éditeur de rapport"
          description="Rédigez un rapport de pentest en Markdown avec aperçu en direct, puis exportez-le en PDF."
        >
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            Réinitialiser
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Exporter en PDF
          </Button>
        </PageHeader>
      </div>

      {/* Barre d'outils : sélecteur de vue */}
      <div className="no-print flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-surface p-1">
          <ViewTab
            active={view === "edit"}
            onClick={() => setView("edit")}
            icon={Pencil}
            label="Éditer"
          />
          <ViewTab
            active={view === "split"}
            onClick={() => setView("split")}
            icon={Columns2}
            label="Côte à côte"
          />
          <ViewTab
            active={view === "preview"}
            onClick={() => setView("preview")}
            icon={Eye}
            label="Aperçu"
          />
        </div>
        <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <FileText className="h-3.5 w-3.5" />
          {markdown.length} caractères
        </p>
      </div>

      {/* Éditeur + aperçu */}
      <div
        className={cn(
          "no-print grid gap-4",
          view === "split" ? "lg:grid-cols-2" : "grid-cols-1",
        )}
      >
        {view !== "preview" && (
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Pencil className="h-3.5 w-3.5" />
              Markdown
            </div>
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              spellCheck={false}
              aria-label="Contenu Markdown du rapport"
              className="scrollbar-thin h-[640px] w-full resize-none bg-surface p-5 font-mono text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:ring-0"
              placeholder="# Votre rapport en Markdown…"
            />
          </Card>
        )}

        {view !== "edit" && (
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              Aperçu
            </div>
            <div className="scrollbar-thin h-[640px] overflow-y-auto p-6">
              <div
                className="markdown-body"
                // Contenu rédigé par l'utilisateur pour son propre rapport,
                // rendu via marked. (Aperçu/impression côté client uniquement.)
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </Card>
        )}
      </div>

      {/* Zone d'impression dédiée (visible uniquement à l'impression). */}
      <div className="print-area hidden print:block" aria-hidden="true">
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Eye;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "bg-primary-soft text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
