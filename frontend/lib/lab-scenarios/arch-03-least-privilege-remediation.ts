import type { ShellScenario, ShellResult } from "@/lib/lab-shell";

/**
 * Scénario du lab 6.2.1 — IAM : moindre privilège.
 * Parcours blue-team : `audit` échoue (Action:* / Resource:*), une commande
 * `fix` ré-écrit la policy en moindre privilège, puis `audit` passe et révèle
 * le flag.
 */
export function createScenario(): ShellScenario {
  const FLAG = "PCE{least_privilege_scoped_policy_2024}";
  let remediated = false;

  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 6.2.1 · IAM : moindre privilège (mode démo)\x1b[0m",
      "Objectif : corriger une policy IAM qui accorde Action:* sur Resource:*.",
      "Indice : éditez iam-policy.json en moindre privilège (actions et ARN scopés), puis ré-auditez.",
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
            "  ls",
            "  cat iam-policy.json",
            "  python3 policy-audit.py    (lance l'audit)",
            "  fix                        (applique le correctif de moindre privilège)",
          ],
        };
      }

      if (cmd === "ls") {
        return { lines: ["iam-policy.json  policy-audit.py"] };
      }

      if (cmd.startsWith("cat") && cmd.includes("iam-policy.json")) {
        if (!remediated) {
          return {
            lines: [
              '"Statement": [{',
              '  "Sid": "AllowEverything",',
              '  "Effect": "Allow",',
              '  \x1b[31m"Action": "*",\x1b[0m',
              '  \x1b[31m"Resource": "*"\x1b[0m',
              "}]",
              "",
              "\x1b[33mStatement dangereux : Action:* + Resource:* = AdministratorAccess.\x1b[0m",
            ],
          };
        }
        return {
          lines: [
            '"Statement": [{',
            '  "Sid": "AllowReportUpload",',
            '  "Effect": "Allow",',
            '  \x1b[32m"Action": ["s3:GetObject", "s3:PutObject"],\x1b[0m',
            '  \x1b[32m"Resource": "arn:aws:s3:::pce-corp-reports/*"\x1b[0m',
            "}]",
          ],
        };
      }

      if (cmd === "fix" || (cmd.startsWith("vi") && cmd.includes("iam-policy")) ||
          (cmd.startsWith("nano") && cmd.includes("iam-policy"))) {
        remediated = true;
        return {
          lines: [
            "iam-policy.json corrigé : actions s3:GetObject/s3:PutObject sur",
            "arn:aws:s3:::pce-corp-reports/*. Plus de wildcard global. Relancez l'audit.",
          ],
        };
      }

      if (cmd.includes("policy-audit.py")) {
        if (!remediated) {
          return {
            lines: [
              "=== Audit IAM (moindre privilège) — policy pce-report-uploader-policy ===",
              "    attachée à : role/pce-report-uploader",
              "",
              "  \x1b[31m[FAIL] AllowEverything  (Effect=Allow)  <== A CORRIGER\x1b[0m",
              "        - Action '*' (toutes les actions) — équivalent AdministratorAccess",
              "        - Resource '*' (toutes les ressources) — restreignez à un ARN précis",
              "",
              "  [!] Policy NON conforme : remplacez Action:'*' / Resource:'*' par",
              '      des actions et ressources scopées, ex. "Action":',
              '      ["s3:GetObject","s3:PutObject"], "Resource":',
              '      "arn:aws:s3:::pce-corp-reports/*".',
              "      Éditez iam-policy.json (commande \x1b[36mfix\x1b[0m) puis ré-auditez.",
            ],
          };
        }
        return {
          lines: [
            "=== Audit IAM (moindre privilège) — policy pce-report-uploader-policy ===",
            "    attachée à : role/pce-report-uploader",
            "",
            "  \x1b[32m[PASS] AllowReportUpload  (Effect=Allow)\x1b[0m",
            "",
            "  [OK] Tous les Statements Allow respectent le moindre privilège.",
            "  Drapeau du lab : \x1b[32m" + FLAG + "\x1b[0m",
            "",
            "Bien joué — copiez le flag et soumettez-le à droite.",
          ],
        };
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}
