/**
 * Mini-shell simulé côté navigateur.
 *
 * Tant que le backend (WebSocket ↔ container Docker) n'est pas branché, le
 * terminal de lab tourne en mode démo avec ce simulateur. Il reproduit un
 * scénario réaliste par challenge afin de pouvoir présenter le parcours
 * apprenant de bout en bout. Dès que NEXT_PUBLIC_API_URL est défini, le
 * terminal se connecte au vrai container et ce module n'est plus utilisé.
 */

import { scenarioRegistry } from "./lab-scenarios";

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

/** Scénario du lab 2.1.3 — wildcard IAM dangereux (Action:* / Resource:*). */
function iamWildcardScenario(): ShellScenario {
  const arnBase = "arn:aws:iam::123456789012:policy";
  const fullAccessArn = `${arnBase}/PCE-Deploy-FullAccess`;

  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 2.1.3 · Wildcard IAM (mode démo)\x1b[0m",
      "Objectif : repérer la policy managée qui accorde Action:\"*\" sur Resource:\"*\".",
      "Indice : inspectez la VERSION PAR DÉFAUT de chaque policy.",
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
            "Commandes :",
            "  aws iam list-policies --scope Local",
            "  aws iam list-policy-versions --policy-arn <arn>",
            "  aws iam get-policy-version  --policy-arn <arn> --version-id <v>",
            "  aws iam audit-policy        --policy-arn <arn>",
          ],
        };
      }

      if (cmd.includes("list-policies")) {
        return {
          lines: [
            "PolicyName                 DefaultVersion  AttachmentCount",
            "PCE-ReadOnly-Billing      v1              4",
            "PCE-S3-AppData            v2              6",
            "\x1b[33mPCE-Deploy-FullAccess     v3              2\x1b[0m",
            "PCE-CloudWatch-Logs       v1              9",
            "",
            "Astuce : la version par défaut compte. Inspectez PCE-Deploy-FullAccess (v3).",
          ],
        };
      }

      if (cmd.includes("list-policy-versions")) {
        if (cmd.includes("PCE-Deploy-FullAccess")) {
          return { lines: ["v1   v2   \x1b[33mv3 (par défaut)\x1b[0m"] };
        }
        return { lines: ["v1 (par défaut)"] };
      }

      if (cmd.includes("get-policy-version")) {
        if (cmd.includes("PCE-Deploy-FullAccess")) {
          return {
            lines: [
              '"Statement": [{',
              '  "Sid": "DeployEverything",',
              '  "Effect": "Allow",',
              '  \x1b[31m"Action": "*"\x1b[0m,',
              '  \x1b[31m"Resource": "*"\x1b[0m',
              "}]",
              "",
              "\x1b[36mAction:* + Resource:* = équivalent AdministratorAccess. Auditez cette policy.\x1b[0m",
            ],
          };
        }
        return { lines: ['"Action": ["s3:GetObject", ...], "Resource": "arn:aws:s3:::pce-app-data/*"  (OK)'] };
      }

      if (cmd.includes("audit-policy")) {
        if (cmd.includes(fullAccessArn) || cmd.includes("PCE-Deploy-FullAccess")) {
          return {
            lines: [
              "Audit IAM — policy PCE-Deploy-FullAccess (version v3)",
              "  \x1b[31m[CRITIQUE]\x1b[0m Action:\"*\" sur Resource:\"*\" -> équivalent AdministratorAccess.",
              "  Remédiation : restreindre actions/ressources au strict nécessaire.",
              "",
              "  Drapeau du lab : \x1b[32mPCE{iam_wildcard_admin_policy_2024}\x1b[0m",
              "",
              "Bien joué — copiez le flag et soumettez-le à droite.",
            ],
          };
        }
        return {
          lines: [
            "  [OK] Aucun wildcard Action:* + Resource:* sur la version par défaut.",
            "  Continuez l'audit (cherchez la policy FullAccess).",
          ],
        };
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}

/** Scénario du lab 3.3.1 — secret AWS dans l'historique git. */
function gitSecretsScenario(): ShellScenario {
  return {
    prompt: "analyst@pce-billing-api$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 3.3.1 · Secrets Git (mode démo)\x1b[0m",
      "Dépôt : pce-billing-api. Un .env avec une clé AWS a été committé puis 'retiré'.",
      "Objectif : retrouver le secret dans l'historique git (le SecretAccessKey = flag).",
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
            "Commandes : help, clear, whoami, ls, git log --oneline,",
            "  git log -p -- .env, git grep \"PCE{\" $(git rev-list --all),",
            "  git show <commit>:.env",
          ],
        };
      }

      if (cmd === "ls") {
        return { lines: ["README.md  app.py  requirements.txt  .gitignore  .env.example"] };
      }

      if (cmd === "cat .env" || cmd === "ls -a") {
        return { lines: ["(.env absent du working tree — il a été supprimé. Cherchez dans l'historique.)"] };
      }

      if (cmd.includes("git log") && cmd.includes("--oneline")) {
        return {
          lines: [
            "a1b2c3d Retrait du .env du suivi git + ajout .gitignore et .env.example",
            "9f8e7d6 Ajout endpoint /version",
            "\x1b[33m4c5b6a7 Ajout config locale .env (creds uploader S3)\x1b[0m",
            "0011223 Initial commit: squelette pce-billing-api (Flask + boto3)",
          ],
        };
      }

      if (cmd.includes("git log") && cmd.includes(".env")) {
        return {
          lines: [
            "commit 4c5b6a7 — Ajout config locale .env",
            "+AWS_ACCESS_KEY_ID=AKIAY34FZKBOKMUTVV7A",
            "+AWS_SECRET_ACCESS_KEY=\x1b[32mPCE{git_history_leaked_aws_key_2024}\x1b[0m",
            "",
            "Le secret vit dans l'historique même si .env a été supprimé au HEAD.",
          ],
        };
      }

      if (cmd.includes("git grep") || (cmd.includes("git log") && cmd.includes("grep"))) {
        return {
          lines: [
            "4c5b6a7:.env:AWS_SECRET_ACCESS_KEY=\x1b[32mPCE{git_history_leaked_aws_key_2024}\x1b[0m",
            "",
            "Bien joué — le SecretAccessKey est le flag. Soumettez-le à droite.",
          ],
        };
      }

      if (cmd.includes("git show") && cmd.includes(".env")) {
        return {
          lines: [
            "APP_ENV=staging",
            "AWS_ACCESS_KEY_ID=AKIAY34FZKBOKMUTVV7A",
            "AWS_SECRET_ACCESS_KEY=\x1b[32mPCE{git_history_leaked_aws_key_2024}\x1b[0m",
            "AWS_DEFAULT_REGION=eu-west-3",
          ],
        };
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}

/** Scénario du lab 4.1.4 — secret codé en dur dans une image Docker. */
function imageSecretsScenario(): ShellScenario {
  return {
    prompt: "analyst@pce-payments-api-image$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 4.1.4 · Secrets dans une image (mode démo)\x1b[0m",
      "Image déballée : pce-payments-api:1.4.2 (couches + config à analyser).",
      "Objectif : retrouver le REGISTRY_TOKEN codé en dur (le flag).",
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
            "Commandes : help, clear, whoami, ls,",
            "  cat history.txt, cat blobs/sha256/*config.json,",
            "  cat layers/04/app/deploy-creds.env, grep -r \"PCE{\" .",
          ],
        };
      }

      if (cmd === "ls") {
        return { lines: ["history.txt  manifest.json  blobs/  layers/"] };
      }

      if (cmd.includes("history.txt")) {
        return {
          lines: [
            "ENV REGISTRY_TOKEN=\x1b[32mPCE{docker_layer_hardcoded_secret_2024}\x1b[0m",
            "COPY deploy-creds.env /app/deploy-creds.env",
            "RUN rm -f /app/deploy-creds.env   <- 'supprimé' mais reste dans la couche 04",
            "",
            "Le secret est codé en dur via ENV (et via deploy-creds.env).",
          ],
        };
      }

      if (cmd.includes("config.json")) {
        return {
          lines: [
            '"Env": [',
            '  "PYTHON_VERSION=3.12.3",',
            '  "REGISTRY_TOKEN=\x1b[32mPCE{docker_layer_hardcoded_secret_2024}\x1b[0m",',
            '  "APP_ENV=production"',
            "]",
          ],
        };
      }

      if (cmd.includes("deploy-creds.env") || (cmd.includes("layers/04"))) {
        return {
          lines: [
            "REGISTRY_TOKEN=\x1b[32mPCE{docker_layer_hardcoded_secret_2024}\x1b[0m",
            "AWS_ACCESS_KEY_ID=AKIAY34FZKBOKMUTVV7A",
            "",
            "Le fichier 'supprimé' reste lisible dans sa couche d'origine.",
          ],
        };
      }

      if (cmd.includes("grep") && cmd.includes("PCE{")) {
        return {
          lines: [
            "blobs/sha256/3f9a1c0b7e21config.json:  \"REGISTRY_TOKEN=PCE{docker_layer_hardcoded_secret_2024}\"",
            "layers/04/app/deploy-creds.env:REGISTRY_TOKEN=\x1b[32mPCE{docker_layer_hardcoded_secret_2024}\x1b[0m",
            "",
            "Bien joué — le REGISTRY_TOKEN est le flag. Soumettez-le à droite.",
          ],
        };
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}

/** Scénario du lab 5.1.1 — détection d'intrusion dans CloudTrail. */
function cloudtrailIntrusionScenario(): ShellScenario {
  const attackerIp = "203.0.113.66";

  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 5.1.1 · Intrusion CloudTrail (mode démo)\x1b[0m",
      "Export : cloudtrail-events.json. Une clé volée a permis une intrusion.",
      "Objectif : repérer l'acteur malveillant et l'AssumeRole non autorisé (le flag).",
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
            "Commandes : help, clear, whoami,",
            "  jq -r '.Records[].sourceIPAddress' cloudtrail-events.json | sort | uniq -c",
            "  jq '.Records[] | select(.sourceIPAddress==\"203.0.113.66\")' cloudtrail-events.json",
            "  grep pceFinding cloudtrail-events.json | verify-finding 203.0.113.66",
          ],
        };
      }

      if (cmd.includes("sourceIPAddress") && cmd.includes("uniq")) {
        return {
          lines: [
            "      3 92.154.10.3       (alice, légitime)",
            "      1 10.0.4.21         (rôle CI, légitime)",
            `      \x1b[33m5 ${attackerIp}      (?? user-agent 'kali')\x1b[0m`,
            "",
            `Une IP détonne : ${attackerIp}. Examinez ses actions.`,
          ],
        };
      }

      if (cmd.includes(attackerIp) && cmd.startsWith("jq")) {
        return {
          lines: [
            "GetCallerIdentity  (clé volée AKIAY34FZKBOKMUTVV7A / billing-uploader)",
            "ListBuckets",
            "\x1b[31mAssumeRole -> OrganizationAccountAccessRole\x1b[0m  (non autorisé)",
            "StopLogging  (désactive CloudTrail)",
            "GetObject    (exfil s3://pce-customer-pii/exports/customers-full.csv)",
            "",
            "L'AssumeRole non autorisé est l'événement pivot.",
          ],
        };
      }

      if (cmd.includes("pceFinding") || cmd.includes("verify-finding")) {
        return {
          lines: [
            "[+] IP attaquante confirmée : 203.0.113.66",
            "Acteur non autorisé: billing-uploader depuis 203.0.113.66 a assumé OrganizationAccountAccessRole.",
            "FLAG=\x1b[32mPCE{cloudtrail_unauthorized_assumerole_2024}\x1b[0m",
            "",
            "Bien joué — copiez le flag et soumettez-le à droite.",
          ],
        };
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}

/** Scénario du lab 6.3.1 — audit CIS Benchmark (S3 Block Public Access). */
function cisAuditScenario(): ShellScenario {
  let remediated = false;

  return {
    prompt: "analyst@cis-audit$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 6.3.1 · Audit CIS (mode démo)\x1b[0m",
      "Compte audité : account-config.json. Un contrôle critique échoue.",
      "Objectif : corriger le finding (CIS 2.1.5) puis relancer l'audit pour le flag.",
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
            "Commandes : help, clear, whoami, ls,",
            "  python3 cis-audit.py",
            "  sed -i 's/\"accountLevel\": false/\"accountLevel\": true/' account-config.json",
          ],
        };
      }

      if (cmd === "ls") {
        return { lines: ["account-config.json  s3.tf  cis-audit.py"] };
      }

      if (cmd.includes("sed") && cmd.includes("accountLevel")) {
        remediated = true;
        return { lines: ["account-config.json corrigé : s3 Block Public Access activé (accountLevel=true)."] };
      }

      if (cmd.includes("cis-audit.py")) {
        if (!remediated) {
          return {
            lines: [
              "=== Audit CIS AWS Foundations Benchmark — compte 123456789012 ===",
              "  [PASS] CIS 1.5    (CRITIQUE) MFA root activé",
              "  \x1b[31m[FAIL] CIS 2.1.5  (CRITIQUE) S3 Block Public Access  <== A CORRIGER\x1b[0m",
              "  [PASS] CIS 3.1    (CRITIQUE) CloudTrail multi-régions",
              "",
              "  Contrôles critiques au vert : 2/3  (score critique : 67%)",
              "  [!] Audit NON conforme : corrigez S3 Block Public Access (accountLevel=true).",
            ],
          };
        }
        return {
          lines: [
            "=== Audit CIS AWS Foundations Benchmark — compte 123456789012 ===",
            "  [PASS] CIS 1.5    (CRITIQUE) MFA root activé",
            "  \x1b[32m[PASS] CIS 2.1.5  (CRITIQUE) S3 Block Public Access\x1b[0m",
            "  [PASS] CIS 3.1    (CRITIQUE) CloudTrail multi-régions",
            "",
            "  Contrôles critiques au vert : 3/3  (score critique : 100%)",
            "  [OK] Tous les contrôles CRITIQUES sont conformes. Audit validé.",
            "  Drapeau du lab : \x1b[32mPCE{cis_public_s3_block_2024}\x1b[0m",
            "",
            "Bien joué — copiez le flag et soumettez-le à droite.",
          ],
        };
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}

/** Scénario du lab 3.1.1 — secrets en clair dans les artefacts Jenkins. */
function jenkinsSecretsScenario(): ShellScenario {
  const flag = "PCE{jenkins_plaintext_aws_creds_2024}";
  return {
    prompt: "analyst@pce-lab:/srv/jenkins$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 3.1.1 · Secrets en clair dans Jenkins (mode démo)\x1b[0m",
      "Objectif : extraire le credential AWS codé en dur dans le pipeline.",
      "Indice : les artefacts du job sont ici (Jenkinsfile, job-config.xml).",
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
            "Commandes : help, clear, whoami, ls, cat <fichier>, grep -ri <motif> .",
            "Astuce : cherchez les credentials AWS codés en dur.",
          ],
        };
      }
      if (cmd === "ls") return { lines: ["Jenkinsfile  job-config.xml"] };
      if (cmd.startsWith("cat") && cmd.includes("Jenkinsfile")) {
        return {
          lines: [
            "pipeline {",
            "  environment {",
            '    AWS_ACCESS_KEY_ID     = "AKIAY34FZKBOKMUTVV7A"',
            `    AWS_SECRET_ACCESS_KEY = "\x1b[32m${flag}\x1b[0m"`,
            '    DB_PASSWORD           = "Pr0d!Billing#2024"',
            "  }",
            "  /* ... stages ... */",
            "}",
          ],
        };
      }
      if (cmd.startsWith("cat") && cmd.includes("job-config")) {
        return {
          lines: [
            "<PasswordParameterDefinition>",
            "  <name>AWS_SECRET_ACCESS_KEY</name>",
            `  <defaultValue>\x1b[32m${flag}\x1b[0m</defaultValue>`,
            "</PasswordParameterDefinition>",
          ],
        };
      }
      if (cmd.startsWith("grep") && /aws_secret/i.test(cmd)) {
        return {
          lines: [
            `Jenkinsfile:    AWS_SECRET_ACCESS_KEY = "\x1b[32m${flag}\x1b[0m"`,
            `job-config.xml: <defaultValue>\x1b[32m${flag}\x1b[0m</defaultValue>`,
            "",
            "Bien joué — soumettez ce flag à droite.",
          ],
        };
      }
      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}

/** Scénario du lab 4.2.1 — ClusterRoleBinding trop permissif (RBAC). */
function k8sRbacScenario(): ShellScenario {
  const flag = "PCE{k8s_clusteradmin_binding_2024}";
  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 4.2.1 · ClusterRoleBinding trop permissif (mode démo)\x1b[0m",
      "Objectif : repérer la liaison RBAC qui accorde cluster-admin à un ServiceAccount.",
      "Indice : interrogez le cluster via kubectl (get/describe/audit-rbac).",
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
            "Commandes : help, clear, kubectl get clusterrolebindings,",
            "  kubectl describe clusterrolebinding <name>, kubectl audit-rbac",
          ],
        };
      }
      if (cmd.startsWith("kubectl get clusterrolebinding")) {
        return {
          lines: [
            "NAME                  ROLE                       SUBJECTS",
            "kube-system-admin     ClusterRole/system:node    SA/default (kube-system)",
            "prod-viewers          ClusterRole/view           SA/payments-api (prod)",
            "ci-bot-cluster-admin  ClusterRole/cluster-admin  SA/ci-bot (ci)",
          ],
        };
      }
      if (cmd.startsWith("kubectl describe") && cmd.includes("ci-bot-cluster-admin")) {
        return {
          lines: [
            "Name:        ci-bot-cluster-admin",
            "Role:        ClusterRole/cluster-admin  (verbs:* resources:* apiGroups:*)",
            "Subjects:    ServiceAccount  ci-bot  (namespace ci)",
            "\x1b[33m=> ce ServiceAccount peut TOUT faire sur l'ensemble du cluster.\x1b[0m",
          ],
        };
      }
      if (cmd.startsWith("kubectl audit-rbac")) {
        return {
          lines: [
            "== Audit RBAC : liaisons vers un rôle d'administration ==",
            "[CRITIQUE] ci-bot-cluster-admin -> cluster-admin -> SA/ci-bot (ci)",
            "",
            `FLAG: \x1b[32m${flag}\x1b[0m`,
            "Bien joué — soumettez ce flag à droite.",
          ],
        };
      }
      if (cmd.startsWith("kubectl")) {
        return { lines: ["Essayez : kubectl get clusterrolebindings, puis kubectl audit-rbac"] };
      }
      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}

export function getScenario(
  challengeId: string,
  labSlug?: string,
): ShellScenario {
  // Labs câblés via un module de scénario dédié (frontend/lib/lab-scenarios/).
  if (labSlug && scenarioRegistry[labSlug]) {
    return scenarioRegistry[labSlug]();
  }
  if (labSlug === "devsecops-02-jenkins-secrets" || challengeId === "3.1.1") {
    return jenkinsSecretsScenario();
  }
  if (labSlug === "container-02-k8s-rbac" || challengeId === "4.2.1") {
    return k8sRbacScenario();
  }
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
  if (labSlug === "iam-01-wildcard-policy" || challengeId === "2.1.3") {
    return iamWildcardScenario();
  }
  if (labSlug === "devsecops-01-git-secrets" || challengeId === "3.3.1") {
    return gitSecretsScenario();
  }
  if (labSlug === "container-01-image-secrets" || challengeId === "4.1.4") {
    return imageSecretsScenario();
  }
  if (labSlug === "soc-01-cloudtrail-intrusion" || challengeId === "5.1.1") {
    return cloudtrailIntrusionScenario();
  }
  if (labSlug === "arch-01-cis-audit" || challengeId === "6.3.1") {
    return cisAuditScenario();
  }
  return genericScenario(challengeId);
}
