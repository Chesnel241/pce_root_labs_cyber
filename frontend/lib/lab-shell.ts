/**
 * Mini-shell simulé côté navigateur.
 *
 * Tant que le backend (WebSocket ↔ container Docker) n'est pas branché, le
 * terminal de lab tourne en mode démo avec ce simulateur. Il reproduit un
 * scénario réaliste par challenge afin de pouvoir présenter le parcours
 * apprenant de bout en bout. Dès que NEXT_PUBLIC_API_URL est défini, le
 * terminal se connecte au vrai container et ce module n'est plus utilisé.
 */

export interface ShellResult {
  lines?: string[];
  clear?: boolean;
}

export interface ShellScenario {
  banner: string[];
  prompt: string;
  run: (input: string) => ShellResult;
}

const GENERIC_HELP = [
  "Commandes disponibles : help, ls, whoami, clear",
  "Ce lab sera exécuté dans un conteneur isolé une fois le backend connecté.",
];

function genericScenario(challengeId: string): ShellScenario {
  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — environnement de lab (mode démo)\x1b[0m",
      `Challenge ${challengeId}`,
      "Tapez \x1b[36mhelp\x1b[0m pour commencer.",
      "",
    ],
    run(input) {
      const cmd = input.trim();
      if (!cmd) return { lines: [] };
      if (cmd === "clear") return { clear: true };
      if (cmd === "help") return { lines: GENERIC_HELP };
      if (cmd === "whoami") return { lines: ["analyst"] };
      if (cmd === "ls") return { lines: ["README.md  notes.txt"] };
      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}

/** Scénario du lab 1.1.1 — découverte d'un bucket S3 public. */
function s3ReconScenario(): ShellScenario {
  const bucket = "pce-corp-public-assets";
  const listing = [
    "2024-03-12 09:14:22       1841 company_brochure.pdf",
    "2024-03-12 09:14:22        204 robots.txt",
    "2024-01-08 17:03:55       3320 backup_db_dump.sql",
    "2024-01-08 17:04:10         96 flag.txt",
  ];

  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 1.1.1 · Reconnaissance S3 (mode démo)\x1b[0m",
      "Objectif : identifier un bucket S3 public et récupérer le flag.",
      "Indice : la CLI AWS peut interroger un bucket sans authentification.",
      "Tapez \x1b[36mhelp\x1b[0m pour la liste des commandes.",
      "",
    ],
    run(input) {
      const cmd = input.trim();
      if (!cmd) return { lines: [] };
      if (cmd === "clear") return { clear: true };
      if (cmd === "whoami") return { lines: ["analyst"] };

      if (cmd === "help") {
        return {
          lines: [
            "Commandes : help, clear, whoami, aws s3 ls <uri>, aws s3 cp <uri> -",
            "Astuce : ajoutez --no-sign-request pour un accès non authentifié.",
          ],
        };
      }

      if (cmd === "ls") {
        return { lines: ["recon_notes.txt  targets.txt"] };
      }

      if (cmd.startsWith("cat ") && cmd.includes("targets")) {
        return { lines: [`Bucket candidat : s3://${bucket}`] };
      }

      if (cmd.startsWith("aws s3 ls")) {
        if (!cmd.includes(bucket)) {
          return {
            lines: [
              "\x1b[33mAccess Denied\x1b[0m — précisez un bucket, ex :",
              `  aws s3 ls s3://${bucket} --no-sign-request`,
            ],
          };
        }
        if (!cmd.includes("--no-sign-request")) {
          return {
            lines: [
              "\x1b[31mUnable to locate credentials\x1b[0m.",
              "Réessayez en accès anonyme : ajoutez --no-sign-request.",
            ],
          };
        }
        return { lines: listing };
      }

      if (cmd.startsWith("aws s3 cp")) {
        if (cmd.includes("flag.txt") && cmd.includes("--no-sign-request")) {
          return {
            lines: [
              "\x1b[32mPCE{s3_public_bucket_recon_2024}\x1b[0m",
              "",
              "Bien joué — copiez ce flag et soumettez-le à droite.",
            ],
          };
        }
        if (cmd.includes("flag.txt")) {
          return { lines: ["Ajoutez --no-sign-request pour l'accès anonyme."] };
        }
        if (cmd.includes("backup_db_dump.sql")) {
          return {
            lines: ["-- dump partiel --", "users(id,email,role) ... [tronqué]"],
          };
        }
        return { lines: ["Spécifiez un objet à copier (ex: flag.txt)."] };
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}

export function getScenario(
  challengeId: string,
  labSlug?: string,
): ShellScenario {
  if (labSlug === "pentest-01-s3-recon" || challengeId === "1.1.1") {
    return s3ReconScenario();
  }
  return genericScenario(challengeId);
}
