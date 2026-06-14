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

/** Scénario du lab 1.2.1 — exfiltration depuis un bucket S3 public (préfixe caché). */
function s3ExfilScenario(): ShellScenario {
  const bucket = "pce-marketing-public";
  const showcase = [
    "                           PRE assets/",
    "                           PRE internal/",
    "2024-05-01 09:00:00       2150 index.html",
    "2024-05-01 09:00:00        318 favicon.ico",
  ];
  const recursive = [
    "2024-05-01 09:00:00       2150 index.html",
    "2024-05-01 09:00:00        318 favicon.ico",
    "2024-05-01 09:00:00     184220 assets/brand-guidelines.pdf",
    "2024-05-01 09:00:00     902113 assets/press-kit.zip",
    "2024-05-01 09:00:00        240 internal/README.txt",
    "2024-05-01 09:00:00       1487 internal/hr/employees-export.csv",
    "2024-05-01 09:00:00        612 internal/backups/wp-config-backup.php",
  ];

  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 1.2.1 · Exfiltration S3 (mode démo)\x1b[0m",
      "Objectif : un bucket public cache un fichier sensible sous un préfixe non listé.",
      "Indice : « bucket public » ≠ « tout est listé ». Pensez à --recursive.",
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
            "Commandes : help, clear, whoami, aws s3 ls [s3://<bucket>] [--recursive], aws s3 cp <uri> -",
            "Astuce : ajoutez --no-sign-request pour un accès non authentifié.",
          ],
        };
      }

      if (cmd === "ls") {
        return { lines: ["recon_notes.txt"] };
      }

      if (cmd.startsWith("aws s3 ls")) {
        if (!cmd.includes(bucket)) {
          return { lines: [`2024-05-01 09:00:00 ${bucket}`] };
        }
        if (cmd.includes("--recursive")) {
          return { lines: recursive };
        }
        return {
          lines: [
            ...showcase,
            "",
            "\x1b[33mSeule la vitrine est listée.\x1b[0m Relancez avec --recursive pour tout voir.",
          ],
        };
      }

      if (cmd.startsWith("aws s3 cp")) {
        if (cmd.includes("internal/hr/employees-export.csv")) {
          return {
            lines: [
              "# Export RH confidentiel — exporté par erreur dans un bucket public.",
              "# PCE_FLAG=\x1b[32mPCE{s3_exfil_hidden_prefix_2024}\x1b[0m",
              "employee_id,full_name,email,department,salary_eur",
              "1001,Amina Diallo,amina.diallo@pce-corp.fr,Engineering,68000",
              "...",
              "",
              "Bien joué — copiez le flag et soumettez-le à droite.",
            ],
          };
        }
        if (cmd.includes("internal/")) {
          return { lines: ["(fichier interne) — cherchez plutôt internal/hr/employees-export.csv"] };
        }
        return { lines: ["Spécifiez un objet à copier (ex: internal/hr/employees-export.csv)."] };
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}

/** Scénario du lab 1.3.1 — PrivEsc IAM via PassRole + CreateAccessKey. */
function iamPrivescScenario(): ShellScenario {
  let passroleDone = false;

  return {
    prompt: "ci-deployer@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 1.3.1 · PrivEsc IAM (mode démo)\x1b[0m",
      "Identité : ci-deployer (pipeline CI/CD aux droits trop larges).",
      "Objectif : enchaîner PassRole -> RunInstances -> CreateAccessKey pour escalader.",
      "Tapez \x1b[36mhelp\x1b[0m pour la liste des commandes.",
      "",
    ],
    run(input) {
      const cmd = input.trim();
      if (!cmd) return { lines: [] };
      if (cmd === "clear") return { clear: true };
      if (cmd === "whoami") return { lines: ["ci-deployer"] };

      if (cmd === "help") {
        return {
          lines: [
            "Commandes :",
            "  aws sts get-caller-identity",
            "  aws iam get-user-policy --user-name ci-deployer --policy-name ci-deploy-inline",
            "  aws iam list-roles | aws iam get-role --role-name ec2-admin-role",
            "  aws ec2 run-instances --image-id ami-pce --iam-instance-profile Name=admin-profile",
            "  aws iam create-access-key --user-name admin-svc",
          ],
        };
      }

      if (cmd.includes("sts get-caller-identity")) {
        return {
          lines: [
            "{",
            '    "UserId": "AIDAPCECIDEPLOYER01",',
            '    "Account": "123456789012",',
            '    "Arn": "arn:aws:iam::123456789012:user/ci-deployer"',
            "}",
          ],
        };
      }

      if (cmd.includes("get-user-policy")) {
        return {
          lines: [
            '"Action": [',
            '    "ec2:RunInstances", "ec2:DescribeInstances",',
            '    \x1b[33m"iam:PassRole"\x1b[0m, \x1b[33m"iam:CreateAccessKey"\x1b[0m,',
            '    "iam:ListRoles", "iam:GetRole"',
            "],",
            '"Resource": "*"',
            "",
            "\x1b[36mPassRole + RunInstances + CreateAccessKey = chaîne d'escalade.\x1b[0m",
          ],
        };
      }

      if (cmd.includes("list-roles")) {
        return { lines: ["ec2-admin-role  arn:aws:iam::123456789012:role/ec2-admin-role"] };
      }

      if (cmd.includes("get-role")) {
        return {
          lines: [
            "RoleName: ec2-admin-role",
            "AttachedPolicies: AdministratorAccess",
            "Trust: ec2.amazonaws.com (sts:AssumeRole)",
            "\x1b[36mCe rôle admin est passable à une EC2.\x1b[0m",
          ],
        };
      }

      if (cmd.includes("run-instances")) {
        if (!cmd.includes("admin-profile")) {
          return {
            lines: [
              "\x1b[31mInvalidParameterValue\x1b[0m : profil d'instance inconnu.",
              "Passez le profil admin : --iam-instance-profile Name=admin-profile",
            ],
          };
        }
        passroleDone = true;
        return {
          lines: [
            "InstanceId: i-0pce1337deadbeef (running)",
            "IamInstanceProfile: admin-profile -> ec2-admin-role",
            "\x1b[32m[!] L'instance assume ec2-admin-role : vous disposez des privilèges admin.\x1b[0m",
          ],
        };
      }

      if (cmd.includes("create-access-key")) {
        if (!passroleDone) {
          return {
            lines: [
              "\x1b[31mAccessDenied\x1b[0m : ci-deployer ne peut pas créer de clé sur admin-svc.",
              "Escaladez d'abord (PassRole -> ec2 run-instances avec admin-profile).",
            ],
          };
        }
        if (!cmd.includes("admin-svc")) {
          return { lines: ["Ciblez l'utilisateur de service admin : --user-name admin-svc"] };
        }
        return {
          lines: [
            "{",
            '    "AccessKey": {',
            '        "UserName": "admin-svc",',
            '        "AccessKeyId": "AKIAPCEADMIN0000FLAG",',
            '        "SecretAccessKey": "\x1b[32mPCE{passrole_createaccesskey_escalation_2024}\x1b[0m",',
            '        "Status": "Active"',
            "    }",
            "}",
            "",
            "Bien joué — le SecretAccessKey est le flag. Soumettez-le à droite.",
          ],
        };
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}

/** Scénario du lab 1.4.1 — SSRF vers l'IMDSv1 EC2 (vol de creds). */
function ssrfImdsScenario(): ShellScenario {
  const imdsBase = "169.254.169.254/latest/meta-data/iam/security-credentials";

  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 1.4.1 · SSRF -> IMDSv1 (mode démo)\x1b[0m",
      "App vulnérable : http://localhost:8080/fetch?url=<URL> (suit l'URL côté serveur).",
      "Objectif : pivoter vers l'IMDS (169.254.169.254) et voler les creds du rôle.",
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
            "Commandes : help, clear, whoami, curl '<URL>'",
            "Cible vulnérable : http://localhost:8080/fetch?url=<URL>",
            "Service de métadonnées EC2 (IMDSv1) : http://169.254.169.254",
          ],
        };
      }

      if (cmd.startsWith("curl")) {
        if (cmd.includes(`${imdsBase}/pce-app-role`)) {
          return {
            lines: [
              "{",
              '  "Code": "Success",',
              '  "Type": "AWS-HMAC",',
              '  "AccessKeyId": "ASIAPCEAPPROLE00FLAG",',
              '  "SecretAccessKey": "\x1b[32mPCE{imds_ssrf_stolen_role_creds_2024}\x1b[0m",',
              '  "Token": "FQoGZXIvYXdzEBYa...SIMULATED...pceroot",',
              '  "Expiration": "2024-06-01T15:55:12Z"',
              "}",
              "",
              "Bien joué — le SecretAccessKey est le flag. Soumettez-le à droite.",
            ],
          };
        }
        if (cmd.includes(`${imdsBase}/`)) {
          return { lines: ["pce-app-role"] };
        }
        if (cmd.includes("169.254.169.254/latest/meta-data")) {
          return { lines: ["iam/", "instance-id", "local-ipv4", "placement/"] };
        }
        if (cmd.includes("169.254.169.254")) {
          return {
            lines: [
              "ami-id  hostname  iam/  instance-id  local-ipv4",
              "Astuce : explorez iam/security-credentials/ pour les rôles.",
            ],
          };
        }
        if (cmd.includes("/fetch?url=")) {
          return {
            lines: [
              "[proxy] Réponse simulée — rien d'intéressant ici.",
              "Et si l'URL pointait vers le service de métadonnées EC2 (169.254.169.254) ?",
            ],
          };
        }
        return { lines: ["Utilisez l'endpoint vulnérable : curl 'http://localhost:8080/fetch?url=<URL>'"] };
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
  if (labSlug === "pentest-02-s3-exfil" || challengeId === "1.2.1") {
    return s3ExfilScenario();
  }
  if (labSlug === "pentest-03-iam-privesc" || challengeId === "1.3.1") {
    return iamPrivescScenario();
  }
  if (labSlug === "pentest-04-ssrf-imds" || challengeId === "1.4.1") {
    return ssrfImdsScenario();
  }
  return genericScenario(challengeId);
}
