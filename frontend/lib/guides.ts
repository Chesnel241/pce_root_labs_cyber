/**
 * Consignes guidées, pensées pour des débutants.
 *
 * L'objectif est d'APPRENDRE : chaque lab est décomposé en contexte clair,
 * objectif, notions à connaître (cliquables via le glossaire) et un pas-à-pas.
 * Les challenges sans guide dédié reçoivent un guide générique structuré.
 */
import { tokenizeWithGlossary } from "./glossary";
import { extraGuides } from "./guides/index";

export interface GuideStep {
  title: string;
  detail: string;
  /** Commande à essayer dans le terminal (affichée avec un bouton copier). */
  command?: string;
}

export interface ChallengeGuide {
  context: string;
  objective: string;
  /** Notions clés (termes du glossaire) à comprendre. */
  concepts: string[];
  steps: GuideStep[];
}


/** Détecte les notions du glossaire présentes dans un texte. */
function detectConcepts(text: string, max = 6): string[] {
  const found: string[] = [];
  for (const seg of tokenizeWithGlossary(text)) {
    if (seg.type === "term" && !found.includes(seg.entry.term)) {
      found.push(seg.entry.term);
      if (found.length >= max) break;
    }
  }
  return found;
}

/** Guide générique structuré pour les challenges sans guide dédié. */
function genericGuide(description: string): ChallengeGuide {
  return {
    context: description,
    objective:
      "Exploitez la mauvaise configuration ciblée par ce challenge pour récupérer le flag (format PCE{...}).",
    concepts: detectConcepts(description),
    steps: [
      {
        title: "Démarrez le lab",
        detail:
          "Cliquez sur « Démarrer le lab » : un terminal isolé s'ouvre. C'est un vrai shell, tapez vos commandes dedans.",
      },
      {
        title: "Explorez l'environnement",
        detail:
          "Repérez les fichiers et services disponibles. Commandes de base utiles selon le lab : ls, cat, whoami, et la commande indiquée dans l'énoncé.",
        command: "ls",
      },
      {
        title: "Identifiez la faille",
        detail:
          "Reliez l'énoncé à la mauvaise configuration visée (voir les notions ci-dessus, cliquables). Les indices vous aident si vous bloquez.",
      },
      {
        title: "Récupérez puis soumettez le flag",
        detail:
          "Une fois la faille exploitée, un flag PCE{...} apparaît. Copiez-le et collez-le dans « Soumettre le flag ».",
      },
    ],
  };
}

export function getGuide(
  challengeId: string,
  description: string,
): ChallengeGuide {
  return extraGuides[challengeId] ?? genericGuide(description);
}
