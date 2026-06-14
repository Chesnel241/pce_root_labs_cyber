/** Indices progressifs par challenge (placeholder tant que l'API n'est pas branchée). */

const specific: Record<string, string[]> = {
  "1.1.1": [
    "Les buckets S3 publics peuvent être interrogés sans authentification grâce à l'option --no-sign-request.",
    "Commencez par lister le contenu : aws s3 ls s3://<bucket> --no-sign-request.",
    "Un fichier flag.txt est présent. Récupérez-le : aws s3 cp s3://<bucket>/flag.txt - --no-sign-request.",
  ],
};

const generic = [
  "Lisez attentivement l'énoncé puis explorez l'environnement avec les commandes de base (ls, whoami, help).",
  "Identifiez précisément le service et la mauvaise configuration ciblés par ce challenge.",
  "Une fois la vulnérabilité exploitée, le flag apparaît. Soumettez-le au format PCE{...}.",
];

export function getHints(challengeId: string): string[] {
  return specific[challengeId] ?? generic;
}

/** Flag attendu en mode démo (cohérent avec le seed backend). */
export function expectedFlag(challengeId: string): string {
  if (challengeId === "1.1.1") return "PCE{s3_public_bucket_recon_2024}";
  return `PCE{${challengeId.replace(/\./g, "_")}_flag}`;
}
