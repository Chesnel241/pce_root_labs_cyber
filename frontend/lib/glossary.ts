/**
 * Glossaire pédagogique. Chaque terme repéré dans les consignes devient
 * cliquable : une pop-up explique la notion / la commande à un débutant.
 *
 * `short` = résumé d'une ligne ; `long` = explication accessible ;
 * `example` = exemple concret (commande, valeur…). `aliases` = autres écritures
 * qui doivent aussi déclencher la pop-up.
 */
export interface GlossaryEntry {
  term: string;
  aliases?: string[];
  short: string;
  long: string;
  example?: string;
}

export const glossaryEntries: GlossaryEntry[] = [
  {
    term: "flag",
    aliases: ["drapeau", "PCE{...}"],
    short: "La preuve que le challenge est résolu.",
    long: "Un « flag » est une chaîne secrète à trouver en exploitant la faille. Ici elle a toujours le format PCE{...}. Quand vous la trouvez, vous la collez dans le champ « Soumettre le flag » pour valider et gagner des XP.",
    example: "PCE{exemple_de_flag_2024}",
  },
  {
    term: "CTF",
    aliases: ["Capture The Flag"],
    short: "« Capture The Flag » : apprendre en cherchant des flags.",
    long: "Format d'exercice de cybersécurité où l'on doit trouver des « flags » cachés en exploitant des vulnérabilités. C'est un terrain d'entraînement : l'objectif est d'apprendre, pas de gagner une course.",
  },
  {
    term: "bucket S3",
    aliases: ["bucket", "S3", "Amazon S3"],
    short: "Un espace de stockage de fichiers dans le cloud AWS.",
    long: "S3 (Simple Storage Service) stocke des fichiers dans des « buckets » (seaux). Mal configuré, un bucket peut être public : n'importe qui peut alors lister et télécharger son contenu, parfois des données sensibles.",
    example: "s3://mon-bucket/fichier.txt",
  },
  {
    term: "--no-sign-request",
    short: "Option AWS CLI : requête anonyme, sans identifiants.",
    long: "Ajoutée à une commande aws, elle envoie la requête SANS authentification. Si une ressource (ex. un bucket S3) répond quand même, c'est qu'elle est accessible publiquement — une mauvaise configuration courante.",
    example: "aws s3 ls s3://bucket --no-sign-request",
  },
  {
    term: "aws s3 ls",
    short: "Lister le contenu d'un bucket S3.",
    long: "Commande de l'AWS CLI qui affiche les fichiers/préfixes d'un bucket. Avec --recursive, elle descend dans tous les sous-dossiers (utile quand un fichier sensible est rangé dans un préfixe non listé par défaut).",
    example: "aws s3 ls s3://bucket --recursive --no-sign-request",
  },
  {
    term: "aws s3 cp",
    short: "Copier/télécharger un objet d'un bucket S3.",
    long: "Télécharge un fichier d'un bucket. En mettant - comme destination, le contenu s'affiche directement dans le terminal (sans créer de fichier).",
    example: "aws s3 cp s3://bucket/flag.txt - --no-sign-request",
  },
  {
    term: "IAM",
    aliases: ["Identity and Access Management"],
    short: "Le système de gestion des accès et identités d'AWS.",
    long: "IAM gère QUI (utilisateurs, rôles) peut faire QUOI (actions) sur QUELLES ressources. Des permissions trop larges sont la première cause d'escalade de privilèges dans le cloud.",
  },
  {
    term: "rôle IAM",
    aliases: ["role IAM", "rôle", "IAM role"],
    short: "Une identité AWS aux permissions définies, « endossable ».",
    long: "Un rôle n'a pas de mot de passe : un service (ex. une instance EC2) ou un utilisateur peut l'« endosser » (assume) pour obtenir temporairement ses permissions. Un rôle trop puissant attaché au mauvais service = danger.",
  },
  {
    term: "politique IAM",
    aliases: ["policy", "policies", "IAM policy", "politique"],
    short: "Un document JSON qui liste les permissions accordées.",
    long: "Une policy décrit les actions autorisées/refusées sur des ressources. Un wildcard (Action:* / Resource:*) donne TOUS les droits sur TOUT — à éviter (principe du moindre privilège).",
    example: '{ "Action": "*", "Resource": "*" }',
  },
  {
    term: "wildcard",
    aliases: ["Action:*", "Resource:*", "joker"],
    short: "Le caractère * qui signifie « tout ».",
    long: "Dans une policy IAM, * autorise toutes les actions ou toutes les ressources. Pratique mais dangereux : c'est le contraire du moindre privilège.",
  },
  {
    term: "PassRole",
    aliases: ["iam:PassRole"],
    short: "Permission de « passer » un rôle à un service.",
    long: "iam:PassRole autorise à attacher un rôle à une ressource (ex. une EC2). Combinée à ec2:RunInstances, elle permet à un attaquant de lancer une machine avec un rôle admin puis d'en voler les accès : une escalade de privilèges classique.",
  },
  {
    term: "AssumeRole",
    aliases: ["sts:AssumeRole", "assume role"],
    short: "Endosser un rôle pour obtenir ses permissions.",
    long: "Action STS qui renvoie des identifiants temporaires correspondant à un rôle. Si la relation de confiance du rôle est trop permissive, n'importe qui peut l'endosser et pivoter.",
  },
  {
    term: "access key",
    aliases: ["access keys", "clé d'accès", "AccessKeyId", "SecretAccessKey"],
    short: "Identifiants programmatiques d'AWS (login/mot de passe d'API).",
    long: "Une paire AccessKeyId + SecretAccessKey authentifie les appels API AWS. Exposée (dans Git, un log, un bucket public…), elle donne un accès direct au compte avec les droits associés.",
  },
  {
    term: "SSRF",
    aliases: ["Server-Side Request Forgery"],
    short: "Faire faire une requête au serveur, à votre place.",
    long: "Server-Side Request Forgery : on pousse une application à émettre une requête vers une URL qu'on choisit. Dans le cloud, on la pointe vers le service de métadonnées interne pour voler des identifiants.",
    example: "/fetch?url=http://169.254.169.254/...",
  },
  {
    term: "IMDS",
    aliases: ["métadonnées", "metadata", "169.254.169.254", "IMDSv1", "IMDSv2"],
    short: "Service de métadonnées d'une instance cloud (EC2).",
    long: "À l'adresse interne 169.254.169.254, une instance EC2 expose ses métadonnées — dont les identifiants temporaires du rôle attaché. Via une SSRF, un attaquant les récupère. IMDSv2 (avec jeton) limite ce risque.",
    example: "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
  },
  {
    term: "Security Group",
    aliases: ["Security Groups", "SG", "0.0.0.0/0"],
    short: "Le pare-feu virtuel d'une ressource AWS.",
    long: "Un Security Group filtre le trafic réseau entrant/sortant. Une règle 0.0.0.0/0 ouvre le port à TOUT Internet — à réserver au strict nécessaire (ex. 443), jamais pour une base de données.",
  },
  {
    term: "RDS",
    short: "Base de données managée d'AWS.",
    long: "Relational Database Service héberge des bases (PostgreSQL, MySQL…). Exposée publiquement (Security Group trop ouvert), elle devient une cible directe.",
  },
  {
    term: "EC2",
    short: "Une machine virtuelle (serveur) dans AWS.",
    long: "Elastic Compute Cloud : des serveurs virtuels. Une EC2 a souvent un rôle IAM attaché, dont les identifiants sont récupérables via le service de métadonnées.",
  },
  {
    term: "CloudTrail",
    short: "Le journal d'audit des actions d'un compte AWS.",
    long: "CloudTrail enregistre les appels d'API (qui, quoi, quand, depuis quelle IP). C'est la source n°1 du défenseur pour détecter une intrusion ou une escalade. Un attaquant cherche souvent à le désactiver.",
  },
  {
    term: "GuardDuty",
    short: "La détection de menaces managée d'AWS.",
    long: "Service qui analyse les logs et lève des « findings » (alertes). Le travail d'analyste consiste à trier les vrais positifs des faux positifs.",
  },
  {
    term: "RBAC",
    aliases: ["Role-Based Access Control"],
    short: "Contrôle d'accès par rôles (ici, dans Kubernetes).",
    long: "RBAC définit qui peut faire quoi dans un cluster via des Roles/ClusterRoles liés à des comptes. Une liaison trop large donne les pleins pouvoirs à un composant qui ne devrait pas les avoir.",
  },
  {
    term: "ClusterRoleBinding",
    short: "Lie un (Cluster)Role à un compte, à l'échelle du cluster.",
    long: "Si un ClusterRoleBinding accorde le rôle cluster-admin (verbe * sur tout) à un ServiceAccount applicatif, un pod compromis contrôle alors l'ensemble du cluster.",
  },
  {
    term: "ServiceAccount",
    short: "L'identité d'un pod dans Kubernetes.",
    long: "Compte utilisé par les pods pour parler à l'API Kubernetes. Ses permissions (via RBAC) doivent être minimales : un SA trop puissant est une cible de choix.",
  },
  {
    term: "kubectl",
    short: "L'outil en ligne de commande de Kubernetes.",
    long: "Permet d'interroger et de modifier un cluster. Ex. kubectl get pour lister des ressources, kubectl describe pour les détailler.",
    example: "kubectl get clusterrolebindings",
  },
  {
    term: "conteneur",
    aliases: ["container", "Docker"],
    short: "Un environnement isolé et léger qui exécute une application.",
    long: "Un conteneur empaquète une appli et ses dépendances. Mal isolé (mode privilégié, socket Docker monté…), il peut permettre de « s'échapper » vers la machine hôte.",
  },
  {
    term: "Terraform",
    aliases: ["IaC", "Infrastructure as Code"],
    short: "Décrire son infrastructure cloud dans des fichiers de code.",
    long: "Terraform (Infrastructure as Code) crée l'infra à partir de fichiers .tf. Une erreur dans le code (bucket public, port ouvert, secret en dur) se déploie partout : on l'audite avant application.",
  },
  {
    term: "CI/CD",
    aliases: ["pipeline", "Jenkinsfile", "GitHub Actions"],
    short: "L'automatisation de la construction et du déploiement.",
    long: "Intégration/Déploiement continus : des pipelines (Jenkins, GitHub Actions) buildent et déploient le code. Ils manipulent des secrets — souvent mal protégés (codés en dur dans un Jenkinsfile, exposés dans les logs).",
  },
  {
    term: "secret",
    aliases: ["secrets", "hardcodé", "en dur"],
    short: "Une donnée sensible (mot de passe, clé, token).",
    long: "Un secret « en dur » est écrit directement dans le code ou la config au lieu d'un coffre dédié (Secrets Manager, Vault). Quiconque lit le fichier — ou l'historique Git — le récupère.",
  },
  {
    term: "git log",
    aliases: ["git history", "historique Git"],
    short: "Afficher l'historique des commits d'un dépôt.",
    long: "Un secret supprimé reste dans l'historique. git log -p montre les modifications passées ; on y retrouve souvent des clés « effacées » mais toujours présentes dans d'anciens commits.",
    example: "git log -p | grep -i secret",
  },
  {
    term: "typosquatting",
    aliases: ["typosquat", "postinstall"],
    short: "Un faux paquet au nom proche d'un vrai, pour piéger.",
    long: "Attaque de la chaîne d'approvisionnement : un paquet malveillant imite le nom d'un paquet légitime (ex. crossenv vs cross-env). Son script postinstall s'exécute à l'installation et peut exfiltrer des données.",
  },
  {
    term: "OIDC",
    aliases: ["OpenID Connect"],
    short: "Un protocole de fédération d'identité (ex. GitHub → AWS).",
    long: "OIDC permet à un service externe (ex. GitHub Actions) d'obtenir des accès AWS sans clé statique. Si la condition de confiance (sub) est trop large, n'importe quel dépôt peut en abuser.",
  },
  {
    term: "MFA",
    aliases: ["authentification multifacteur"],
    short: "Une seconde preuve d'identité en plus du mot de passe.",
    long: "Multi-Factor Authentication : un code temporaire en plus du mot de passe. Un compte IAM sans MFA est bien plus facile à compromettre.",
  },
  {
    term: "jq",
    short: "Un outil pour lire et filtrer du JSON en ligne de commande.",
    long: "jq parcourt et filtre des fichiers JSON (logs CloudTrail, findings GuardDuty…). Indispensable pour l'analyse défensive.",
    example: "jq '.Records[] | select(.eventName==\"AssumeRole\")' fichier.json",
  },
  {
    term: "grep",
    short: "Rechercher un motif (texte) dans des fichiers.",
    long: "grep affiche les lignes correspondant à un motif. Avec -r il cherche récursivement dans un dossier. Très utile pour repérer un secret ou un flag.",
    example: 'grep -r "PCE{" .',
  },
  {
    term: "reverse proxy",
    short: "Un intermédiaire qui route les requêtes vers les services.",
    long: "Un reverse proxy (Caddy, Nginx, Traefik) reçoit les requêtes HTTPS et les transmet aux services internes. Il gère le TLS et doit aussi relayer les connexions WebSocket (terminal du lab).",
  },
  {
    term: "WebSocket",
    aliases: ["WSS", "ws"],
    short: "Une connexion bidirectionnelle en temps réel.",
    long: "Protocole gardant une connexion ouverte entre le navigateur et le serveur. Ici, il relie le terminal de la page au shell du conteneur de lab, en temps réel.",
  },
  {
    term: "chiffrement",
    aliases: ["encryption", "at-rest"],
    short: "Rendre des données illisibles sans la clé.",
    long: "Le chiffrement « at-rest » protège les données stockées. Un bucket S3 sans chiffrement stocke en clair : combiné à une fuite d'accès, tout est exposé.",
  },
];

/* ------------------------------------------------------------------ */
/* Recherche des termes dans un texte                                  */
/* ------------------------------------------------------------------ */

/** Map "terme/alias" en minuscules -> entrée. */
const lookup = new Map<string, GlossaryEntry>();
for (const entry of glossaryEntries) {
  lookup.set(entry.term.toLowerCase(), entry);
  for (const alias of entry.aliases ?? []) lookup.set(alias.toLowerCase(), entry);
}

// Tous les termes, triés du plus long au plus court (priorité aux expressions).
const allTerms = Array.from(lookup.keys()).sort((a, b) => b.length - a.length);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const TERM_REGEX = new RegExp(
  `(${allTerms.map(escapeRegExp).join("|")})`,
  "gi",
);

/** Un caractère « de mot » (lettre/chiffre/_/-) côté frontière. */
function isWordChar(ch: string | undefined): boolean {
  return !!ch && /[\w-]/.test(ch);
}

export type GlossarySegment =
  | { type: "text"; value: string }
  | { type: "term"; value: string; entry: GlossaryEntry };

/**
 * Découpe un texte en segments, en isolant les termes du glossaire (en
 * respectant les frontières de mots pour éviter les correspondances partielles).
 */
export function tokenizeWithGlossary(text: string): GlossarySegment[] {
  const segments: GlossarySegment[] = [];
  let last = 0;
  TERM_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TERM_REGEX.exec(text)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    const before = text[start - 1];
    const after = text[end];
    // Frontière : éviter de matcher au milieu d'un mot.
    if (isWordChar(before) || isWordChar(after)) continue;
    const entry = lookup.get(m[0].toLowerCase());
    if (!entry) continue;
    if (start > last) segments.push({ type: "text", value: text.slice(last, start) });
    segments.push({ type: "term", value: m[0], entry });
    last = end;
  }
  if (last < text.length) segments.push({ type: "text", value: text.slice(last) });
  return segments;
}

export function getGlossaryEntry(term: string): GlossaryEntry | undefined {
  return lookup.get(term.toLowerCase());
}
