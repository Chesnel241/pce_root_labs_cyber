import type { ShellScenario, ShellResult } from "@/lib/lab-shell";

/**
 * Scénario du lab 6.1.2 — Security Group : moindre exposition.
 * Parcours blue-team : `audit` échoue (règle 0.0.0.0/0 sur tous les ports),
 * une commande `fix` ré-écrit la règle en moindre exposition, puis `audit`
 * passe et révèle le flag.
 */
export function createScenario(): ShellScenario {
  const FLAG = "PCE{security_group_least_exposure_2024}";
  let remediated = false;

  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 6.1.2 · Security Group : moindre exposition (mode démo)\x1b[0m",
      "Objectif : corriger un Security Group qui ouvre 0.0.0.0/0 sur tous les ports.",
      "Indice : éditez security-group.json en moindre exposition (443/tcp depuis un CIDR), puis ré-auditez.",
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
            "  cat security-group.json",
            "  python3 sg-audit.py        (lance l'audit)",
            "  fix                        (applique le correctif de moindre exposition)",
          ],
        };
      }

      if (cmd === "ls") {
        return { lines: ["security-group.json  sg-audit.py"] };
      }

      if (cmd.startsWith("cat") && cmd.includes("security-group.json")) {
        if (!remediated) {
          return {
            lines: [
              '"ingress": [',
              "  {",
              '    \x1b[31m"protocol": "-1", "fromPort": 0, "toPort": 65535, "cidr": "0.0.0.0/0"\x1b[0m',
              "  }",
              "]",
              "",
              "\x1b[33mRègle dangereuse : tout Internet, tous les ports.\x1b[0m",
            ],
          };
        }
        return {
          lines: [
            '"ingress": [',
            "  {",
            '    \x1b[32m"protocol": "tcp", "fromPort": 443, "toPort": 443, "cidr": "10.0.0.0/16"\x1b[0m',
            "  }",
            "]",
          ],
        };
      }

      if (cmd === "fix" || (cmd.startsWith("vi") && cmd.includes("security-group")) ||
          (cmd.startsWith("nano") && cmd.includes("security-group"))) {
        remediated = true;
        return {
          lines: [
            "security-group.json corrigé : règle ingress = tcp 443 depuis 10.0.0.0/16.",
            "Plus de 0.0.0.0/0, plus de « tous ports ». Relancez l'audit.",
          ],
        };
      }

      if (cmd.includes("sg-audit.py")) {
        if (!remediated) {
          return {
            lines: [
              "=== Audit Security Group — pce-corp-web-tier (sg-0a1b2c3d4e5f6a7b8) ===",
              "",
              "  \x1b[31m[FAIL] ingress[0]  -1 port:0-65535 depuis 0.0.0.0/0  <== A CORRIGER\x1b[0m",
              "        - CIDR ouvert à tout Internet (0.0.0.0/0)",
              "        - protocole '-1' (tous protocoles)",
              "        - plage de ports 0-65535 (tous les ports)",
              "",
              "  [!] Security Group NON conforme : remplacez la règle par une",
              '      règle de moindre exposition, ex. { "protocol": "tcp",',
              '      "fromPort": 443, "toPort": 443, "cidr": "10.0.0.0/16" }.',
              "      Éditez security-group.json (commande \x1b[36mfix\x1b[0m) puis ré-auditez.",
            ],
          };
        }
        return {
          lines: [
            "=== Audit Security Group — pce-corp-web-tier (sg-0a1b2c3d4e5f6a7b8) ===",
            "",
            "  \x1b[32m[PASS] ingress[0]  tcp port:443-443 depuis 10.0.0.0/16\x1b[0m",
            "",
            "  [OK] Toutes les règles ingress respectent le moindre privilège réseau.",
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
