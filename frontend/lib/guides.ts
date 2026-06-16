/**
 * Consignes guidées, pensées pour des débutants.
 *
 * L'objectif est d'APPRENDRE : chaque lab est décomposé en contexte clair,
 * objectif, notions à connaître (cliquables via le glossaire) et un pas-à-pas.
 * Les challenges sans guide dédié reçoivent un guide générique structuré.
 */
import { tokenizeWithGlossary } from "./glossary";

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

const guides: Record<string, ChallengeGuide> = {
  "1.1.1": {
    context:
      "Une entreprise a déposé des fichiers dans un bucket S3 sans le protéger. Quand un bucket est public, n'importe qui peut lister et télécharger son contenu — même sans compte AWS.",
    objective:
      "Lister le contenu du bucket public sans authentification, puis récupérer le flag caché dans un fichier.",
    concepts: ["bucket S3", "--no-sign-request", "aws s3 ls", "aws s3 cp", "flag"],
    steps: [
      {
        title: "Démarrez le lab",
        detail:
          "Cliquez sur « Démarrer le lab » : un terminal isolé s'ouvre à droite. C'est un vrai shell, tapez vos commandes dedans.",
      },
      {
        title: "Listez le bucket en accès anonyme",
        detail:
          "L'option --no-sign-request envoie la requête sans identifiants. Si le bucket répond, c'est qu'il est public.",
        command: "aws s3 ls s3://<bucket> --no-sign-request",
      },
      {
        title: "Repérez le fichier sensible",
        detail:
          "Cherchez un fichier au nom évocateur (flag.txt, backup, config…). Au besoin, listez tout en récursif avec --recursive.",
      },
      {
        title: "Récupérez le flag",
        detail:
          "Affichez le contenu du fichier directement dans le terminal (destination « - »). Le flag est au format PCE{...}.",
        command: "aws s3 cp s3://<bucket>/flag.txt - --no-sign-request",
      },
      {
        title: "Soumettez le flag",
        detail:
          "Copiez la valeur PCE{...} et collez-la dans le champ « Soumettre le flag » en bas. 🎉",
      },
    ],
  },
  "1.2.1": {
    context:
      "Un bucket marketing est public, mais le fichier sensible n'est pas visible au premier coup d'œil : il est rangé dans un préfixe (sous-dossier) qui n'apparaît pas dans un listing simple.",
    objective:
      "Énumérer TOUT le bucket pour découvrir le préfixe caché, puis exfiltrer le fichier sensible.",
    concepts: ["bucket S3", "aws s3 ls", "--no-sign-request", "secret", "flag"],
    steps: [
      { title: "Démarrez le lab", detail: "Ouvrez le terminal du lab." },
      {
        title: "Listez tout le bucket en récursif",
        detail:
          "Un listing simple ne montre que la « vitrine ». --recursive descend dans tous les préfixes et révèle les dossiers oubliés (ex. internal/).",
        command: "aws s3 ls s3://<bucket> --recursive --no-sign-request",
      },
      {
        title: "Exfiltrez le fichier caché",
        detail:
          "Téléchargez l'objet sensible repéré (ex. un export RH). Le flag est dans son contenu.",
        command: "aws s3 cp s3://<bucket>/internal/.../fichier - --no-sign-request",
      },
      { title: "Soumettez le flag", detail: "Collez le PCE{...} trouvé." },
    ],
  },
  "1.3.1": {
    context:
      "Vous disposez d'un accès limité, mais vos permissions IAM contiennent une combinaison dangereuse. En l'exploitant, on peut obtenir des droits d'administrateur : c'est une escalade de privilèges.",
    objective:
      "Repérer la combinaison PassRole + lancement d'instance, l'exploiter pour récupérer des identifiants admin, et trouver le flag.",
    concepts: ["IAM", "politique IAM", "PassRole", "rôle IAM", "access key", "EC2"],
    steps: [
      { title: "Démarrez le lab", detail: "Ouvrez le terminal du lab." },
      {
        title: "Identifiez-vous et auditez vos droits",
        detail:
          "Regardez qui vous êtes puis la politique attachée à votre utilisateur. Cherchez iam:PassRole combiné à ec2:RunInstances.",
        command: "aws iam get-user-policy --user-name <user> --policy-name <policy>",
      },
      {
        title: "Exploitez PassRole",
        detail:
          "Lancez une instance EC2 en lui « passant » le rôle admin : l'instance hérite de ses permissions, dont vous récupérez les identifiants.",
      },
      {
        title: "Posez un accès persistant",
        detail:
          "Avec les droits admin, créez une access key. La valeur du SecretAccessKey renvoyée est le flag.",
        command: "aws iam create-access-key --user-name <admin>",
      },
      { title: "Soumettez le flag", detail: "Collez le PCE{...} obtenu." },
    ],
  },
  "1.4.1": {
    context:
      "Une application web possède une fonctionnalité qui va chercher une URL pour vous (SSRF). En la pointant vers l'adresse interne des métadonnées du cloud, on peut voler les identifiants du rôle de la machine.",
    objective:
      "Utiliser la SSRF pour atteindre le service de métadonnées (169.254.169.254) et exfiltrer les identifiants IAM temporaires.",
    concepts: ["SSRF", "IMDS", "rôle IAM", "access key", "EC2"],
    steps: [
      { title: "Démarrez le lab", detail: "Ouvrez le terminal du lab. L'app écoute en local (ex. http://localhost:8080)." },
      {
        title: "Testez l'endpoint vulnérable",
        detail:
          "L'endpoint /fetch?url=... récupère une URL côté serveur. Essayez-le avec une URL quelconque pour comprendre son comportement.",
      },
      {
        title: "Pointez vers les métadonnées",
        detail:
          "Demandez l'URL interne des métadonnées EC2 pour lister les rôles disponibles.",
        command:
          "/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/",
      },
      {
        title: "Volez les identifiants du rôle",
        detail:
          "Demandez les credentials du rôle listé : le SecretAccessKey renvoyé est le flag.",
      },
      { title: "Soumettez le flag", detail: "Collez le PCE{...} récupéré." },
    ],
  },
  "2.1.3": {
    context:
      "Vous êtes analyste sécurité. Une des politiques IAM du compte est beaucoup trop permissive (un wildcard donne tous les droits sur tout). Votre travail : la détecter.",
    objective:
      "Auditer les politiques IAM, repérer celle qui contient Action:* / Resource:*, et valider le constat.",
    concepts: ["IAM", "politique IAM", "wildcard", "MFA"],
    steps: [
      { title: "Démarrez le lab", detail: "Ouvrez le terminal du lab." },
      {
        title: "Listez les politiques locales",
        detail: "Affichez les politiques du compte. Une porte un nom évocateur.",
        command: "aws iam list-policies --scope Local",
      },
      {
        title: "Inspectez la version par défaut",
        detail:
          "Examinez le contenu de la politique suspecte : cherchez \"Action\": \"*\" avec \"Resource\": \"*\".",
        command: "aws iam get-policy-version --policy-arn <arn> --version-id <v>",
      },
      {
        title: "Confirmez le finding",
        detail:
          "Lancez l'audit sur la politique fautive : il révèle le flag une fois la mauvaise configuration identifiée.",
      },
      { title: "Soumettez le flag", detail: "Collez le PCE{...} affiché." },
    ],
  },
};

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
  return guides[challengeId] ?? genericGuide(description);
}
