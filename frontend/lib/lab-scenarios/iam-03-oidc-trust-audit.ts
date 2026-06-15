import type { ShellScenario, ShellResult } from "@/lib/lab-shell";

/** Scénario du lab 2.3.1 — trust policy OIDC GitHub Actions trop large (sub wildcard). */
export function createScenario(): ShellScenario {
  const flag = "PCE{oidc_trust_wildcard_sub_2024}";

  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 2.3.1 · Trust OIDC GitHub Actions (mode démo)\x1b[0m",
      "Objectif : auditer les trust policies et repérer le rôle OIDC GitHub Actions dont le claim sub est trop large.",
      "Indice : un sub en \"repo:*\" (au lieu de repo:org/dépôt:...) laisse n'importe quel dépôt assumer le rôle.",
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
            "  aws iam list-roles",
            "  aws iam list-open-id-connect-providers",
            "  aws iam get-role     --role-name <name>",
            "  aws iam audit-trust  --role-name <name>",
          ],
        };
      }

      if (cmd.includes("list-open-id-connect-providers")) {
        return {
          lines: [
            "Arn                                                                                Url",
            "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com        token.actions.githubusercontent.com",
            "",
            "\x1b[36mLes rôles de confiance OIDC GitHub Actions méritent un audit du claim sub.\x1b[0m",
          ],
        };
      }

      if (cmd.includes("list-roles")) {
        return {
          lines: [
            "RoleName             AttachedManagedPolicies",
            "\x1b[33mgha-deploy-prod      arn:aws:iam::aws:policy/PowerUserAccess\x1b[0m",
            "gha-deploy-staging   arn:aws:iam::123456789012:policy/PCE-Staging-Deploy",
            "ec2-app-role         arn:aws:iam::123456789012:policy/PCE-S3-AppData",
            "",
            "Astuce : inspectez les rôles 'gha-*' (déploiement via GitHub Actions).",
          ],
        };
      }

      if (cmd.includes("get-role")) {
        if (cmd.includes("gha-deploy-prod")) {
          return {
            lines: [
              '"AssumeRolePolicyDocument": {',
              '  "Statement": [{',
              '    "Effect": "Allow",',
              '    "Principal": { "Federated": ".../token.actions.githubusercontent.com" },',
              '    "Action": "sts:AssumeRoleWithWebIdentity",',
              '    "Condition": {',
              '      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },',
              '      "StringLike":   { "token.actions.githubusercontent.com:sub": \x1b[31m"repo:*"\x1b[0m }',
              "    }",
              "  }]",
              "}",
              "",
              "\x1b[36msub=\"repo:*\" : tout dépôt GitHub peut assumer ce rôle. Auditez-le.\x1b[0m",
            ],
          };
        }
        if (cmd.includes("gha-deploy-staging")) {
          return {
            lines: [
              '"Condition": {',
              '  "StringEquals": {',
              '    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",',
              '    "token.actions.githubusercontent.com:sub": \x1b[32m"repo:pce-corp/pce-app:ref:refs/heads/main"\x1b[0m',
              "  }",
              "}",
              "",
              "\x1b[32msub scopé à un dépôt + branche précis : trust policy saine.\x1b[0m",
            ],
          };
        }
        if (cmd.includes("ec2-app-role")) {
          return {
            lines: [
              '"Principal": { "Service": "ec2.amazonaws.com" }, "Action": "sts:AssumeRole"',
              "",
              "Trust de service EC2 classique : aucune confiance OIDC ici.",
            ],
          };
        }
        return { lines: ["Précisez --role-name (gha-deploy-prod | gha-deploy-staging | ec2-app-role)."] };
      }

      if (cmd.includes("audit-trust") || cmd.includes("audit-role")) {
        if (cmd.includes("gha-deploy-prod")) {
          return {
            lines: [
              "Audit IAM — trust policy du rôle gha-deploy-prod",
              "  Provider OIDC de confiance : token.actions.githubusercontent.com",
              "  Valeur(s) du claim sub      : repo:*",
              "",
              "  \x1b[31m[CRITIQUE]\x1b[0m La condition sur le claim sub est trop large : repo:*",
              "  -> N'importe quel dépôt GitHub (y compris un dépôt attaquant) peut assumer ce rôle.",
              "  Remédiation : scoper le sub, ex : repo:pce-corp/pce-app:ref:refs/heads/main",
              "",
              `  Drapeau du lab : \x1b[32m${flag}\x1b[0m`,
              "",
              "Bien joué — copiez le flag et soumettez-le à droite.",
            ],
          };
        }
        if (cmd.includes("gha-deploy-staging")) {
          return {
            lines: [
              "Audit IAM — trust policy du rôle gha-deploy-staging",
              "  Provider OIDC de confiance : token.actions.githubusercontent.com",
              "  Valeur(s) du claim sub      : repo:pce-corp/pce-app:ref:refs/heads/main",
              "",
              "  [OK] Le claim sub est correctement scopé à un dépôt précis. Trust policy saine.",
            ],
          };
        }
        if (cmd.includes("ec2-app-role")) {
          return {
            lines: [
              "Audit IAM — trust policy du rôle ec2-app-role",
              "  [OK] Aucune confiance OIDC GitHub Actions dans cette trust policy.",
              "  Continuez l'audit des autres rôles (aws iam list-roles).",
            ],
          };
        }
        return {
          lines: [
            "  Précisez --role-name. Cherchez un rôle OIDC GitHub Actions au sub trop large.",
          ],
        };
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}
