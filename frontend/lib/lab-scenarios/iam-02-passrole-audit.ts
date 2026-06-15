import type { ShellScenario, ShellResult } from "@/lib/lab-shell";

/** Scénario du lab 2.2.1 — escalade IAM via iam:PassRole + ec2:RunInstances. */
export function createScenario(): ShellScenario {
  const flag = "PCE{passrole_runinstances_privesc_2024}";

  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 2.2.1 · PassRole + RunInstances (mode démo)\x1b[0m",
      "Objectif : auditer les utilisateurs IAM et repérer celui qui cumule iam:PassRole (non restreint) + ec2:RunInstances.",
      "Indice : un PassRole sur Resource:\"*\" sans condition iam:PassedToService + RunInstances = escalade.",
      "Tapez \x1b[36mhelp\x1b[0m pour la liste des commandes.",
      "",
    ],
    run(input): ShellResult {
      const cmd = input.trim();
      if (!cmd) return { lines: [] };
      if (cmd === "clear") return { clear: true };
      if (cmd === "whoami") return { lines: ["analyst"] };

      if (cmd === "help") {
        return {
          lines: [
            "Commandes :",
            "  aws iam list-users",
            "  aws iam list-user-policies --user-name <name>",
            "  aws iam get-user-policy    --user-name <name> --policy-name <p>",
            "  aws iam list-roles",
            "  aws iam audit-user         --user-name <name>",
          ],
        };
      }

      if (cmd.includes("list-users")) {
        return {
          lines: [
            "UserName                 InlinePolicyCount",
            "alice-readonly           1",
            "bob-ec2-operator         1",
            "\x1b[33msvc-ci-deployer          1\x1b[0m",
            "carol-passrole-scoped    1",
            "",
            "Astuce : inspectez svc-ci-deployer (deploy CI/CD aux droits larges).",
          ],
        };
      }

      if (cmd.includes("list-roles")) {
        return {
          lines: [
            "RoleName         AttachedManagedPolicies",
            "ec2-admin-role   arn:aws:iam::aws:policy/AdministratorAccess",
            "",
            "\x1b[36mCe rôle admin pourrait être passé à une EC2 via un profil d'instance.\x1b[0m",
          ],
        };
      }

      if (cmd.includes("list-user-policies")) {
        if (cmd.includes("svc-ci-deployer")) {
          return { lines: ["ci-deploy-inline"] };
        }
        if (cmd.includes("carol-passrole-scoped")) {
          return { lines: ["lambda-deploy-scoped"] };
        }
        if (cmd.includes("bob-ec2-operator")) {
          return { lines: ["ec2-operate"] };
        }
        return { lines: ["readonly-billing"] };
      }

      if (cmd.includes("get-user-policy")) {
        if (cmd.includes("svc-ci-deployer")) {
          return {
            lines: [
              '"Statement": [',
              "  {",
              '    "Sid": "Deploy", "Effect": "Allow",',
              '    "Action": [\x1b[31m"ec2:RunInstances"\x1b[0m, "ec2:DescribeInstances", "ec2:CreateTags"],',
              '    "Resource": "*"',
              "  },",
              "  {",
              '    "Sid": "PassAnyRole", "Effect": "Allow",',
              '    "Action": \x1b[31m"iam:PassRole"\x1b[0m, "Resource": \x1b[31m"*"\x1b[0m',
              "  }",
              "]",
              "",
              "\x1b[36miam:PassRole (Resource:* sans condition) + ec2:RunInstances = escalade.\x1b[0m",
            ],
          };
        }
        if (cmd.includes("carol-passrole-scoped")) {
          return {
            lines: [
              '"Action": "iam:PassRole",',
              '"Resource": "arn:aws:iam::123456789012:role/lambda-exec-pce-app",',
              '"Condition": { "StringEquals": { "iam:PassedToService": "lambda.amazonaws.com" } }',
              "",
              "\x1b[32mPassRole RESTREINT (ARN précis + condition) : risque maîtrisé.\x1b[0m",
            ],
          };
        }
        if (cmd.includes("bob-ec2-operator")) {
          return {
            lines: [
              '"Action": ["ec2:RunInstances", "ec2:DescribeInstances", "ec2:StartInstances", "ec2:StopInstances"]',
              "",
              "RunInstances présent mais PAS de iam:PassRole : pas d'escalade.",
            ],
          };
        }
        return { lines: ['"Action": ["aws-portal:ViewBilling", "ce:GetCostAndUsage"]  (lecture seule, OK)'] };
      }

      if (cmd.includes("audit-user") || cmd.includes("audit-policy")) {
        if (cmd.includes("svc-ci-deployer")) {
          return {
            lines: [
              "Audit IAM — utilisateur svc-ci-deployer",
              "  iam:PassRole          : OUI",
              "  PassRole non restreint : OUI (Resource:* sans condition iam:PassedToService)",
              "  ec2:RunInstances      : OUI",
              "",
              "  \x1b[31m[CRITIQUE]\x1b[0m iam:PassRole (non restreint) + ec2:RunInstances détectés.",
              "  -> Lancer une EC2 avec un profil lié à ec2-admin-role, puis voler ses creds via l'IMDS.",
              "  Remédiation : restreindre iam:PassRole à un ARN précis + condition iam:PassedToService.",
              "",
              `  Drapeau du lab : \x1b[32m${flag}\x1b[0m`,
              "",
              "Bien joué — copiez le flag et soumettez-le à droite.",
            ],
          };
        }
        if (cmd.includes("carol-passrole-scoped")) {
          return {
            lines: [
              "Audit IAM — utilisateur carol-passrole-scoped",
              "  [INFO] PassRole présent mais RESTREINT (ARN précis + condition). Pas de RunInstances.",
              "  Continuez l'audit (cherchez le déployeur CI).",
            ],
          };
        }
        return {
          lines: [
            "  [OK] Pas de couple iam:PassRole (non restreint) + ec2:RunInstances.",
            "  Continuez l'audit des autres utilisateurs (aws iam list-users).",
          ],
        };
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}
