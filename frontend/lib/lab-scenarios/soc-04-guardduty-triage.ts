import type { ShellScenario, ShellResult } from "@/lib/lab-shell";

/**
 * Scénario du lab 5.4.2 — Triage GuardDuty : isoler le vrai positif.
 * L'apprenant trie un lot de findings GuardDuty (mix vrais/faux positifs),
 * dépasse la simple sévérité pour lire le contexte, identifie l'unique vrai
 * positif (UnauthorizedAccess:IAMUser/MaliciousIPCaller) et confirme son Id
 * pour révéler le flag.
 */
export function createScenario(): ShellScenario {
  const flag = "PCE{guardduty_true_positive_2024}";
  const trueId = "5ec0a1b2c3d4e5f6a7b8c9d0e1f2beef";

  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 5.4.2 · Triage GuardDuty (mode démo)\x1b[0m",
      "Objectif : trier un lot de findings GuardDuty et isoler l'unique VRAI positif.",
      "Indice : la sévérité ne suffit pas — lisez le contexte (IP interne ? activité autorisée ? threat-list réelle ?).",
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
            "  jq -r '.Findings[] | \"\\(.Severity) \\(.Type) \\(.Id)\"' guardduty-findings.json | sort -rn",
            "  jq -r '.Findings[] | \"[\\(.Verdict)] \\(.Type) — \\(.Description)\"' guardduty-findings.json",
            "  grep pceFinding guardduty-findings.json",
            `  verify-finding ${trueId}`,
          ],
        };
      }

      if (cmd === "ls") {
        return { lines: ["guardduty-findings.json"] };
      }

      // Étape 1 : prioriser par sévérité.
      if (cmd.startsWith("jq") && cmd.includes("Severity") && cmd.includes("sort")) {
        return {
          lines: [
            `\x1b[33m8 UnauthorizedAccess:IAMUser/MaliciousIPCaller ${trueId}\x1b[0m`,
            "5 UnauthorizedAccess:EC2/SSHBruteForce 3cc2f5a9e3b2c2d3e4f5a6b7c8d9e0f1",
            "4 Recon:IAMUser/MaliciousIPCaller.Custom 4dd3a6b0f4c3d3e4f5a6b7c8d9e0f1a2",
            "3 Exfiltration:S3/ObjectRead.Unusual 2bb1e4f8d2a1b1c2d3e4f5a6b7c8d9e0",
            "2 Recon:EC2/Portscan 1aa0d3e7c1f0a0b1c2d3e4f5a6b7c8d9",
            "",
            "Le plus sévère (8.0) est candidat — mais vérifiez le contexte de chacun.",
          ],
        };
      }

      // Étape 2 : lire le contexte (verdict + description).
      if (cmd.startsWith("jq") && (cmd.includes("Verdict") || cmd.includes("Description"))) {
        return {
          lines: [
            "[false-positive] Recon:EC2/Portscan — scanner de vuln autorisé (CHG-2291), IP interne.",
            "[false-positive] Exfiltration:S3/ObjectRead.Unusual — job de restore test, rôle/IP internes.",
            "\x1b[31m[true-positive] UnauthorizedAccess:IAMUser/MaliciousIPCaller — clé volée, IP 203.0.113.66 sur threat-list ProofPoint, us-east-1, sans MFA.\x1b[0m",
            "[false-positive] UnauthorizedAccess:EC2/SSHBruteForce — engagement RedTeam planifié (RT-2024-07).",
            "[false-positive] Recon:IAMUser/MaliciousIPCaller.Custom — IP INTERNE (10.0.9.12) sur watchlist custom mal réglée.",
            "",
            "\x1b[36mUn seul finding ne s'explique pas : le MaliciousIPCaller sur 203.0.113.66.\x1b[0m",
          ],
        };
      }

      // Confirmation du finding.
      if (cmd.startsWith("verify-finding") || cmd.includes("pceFinding")) {
        if (cmd.includes(trueId)) {
          return {
            lines: [
              `[+] Vrai positif confirme : ${trueId}`,
              "[+] Detail : UnauthorizedAccess:IAMUser/MaliciousIPCaller (sev 8.0)",
              "    Acteur : billing-uploader (AKIAY34FZKBOKMUTVV7A)",
              "    IP : 203.0.113.66 (TOR-Exit-Relay) — threat-list ProofPoint",
              "[+] Finding :",
              `True positive confirme: ... FLAG=\x1b[32m${flag}\x1b[0m`,
              "",
              "Bien joué — copiez le flag et soumettez-le à droite.",
            ],
          };
        }
        if (cmd.startsWith("verify-finding")) {
          return {
            lines: [
              "[-] Ce finding n'est pas le vrai positif a escalader.",
              "    Astuce : les faux positifs ont une TriageNote (IP interne, activité autorisée).",
              "    Cherchez celui dont le contexte (threat-list réelle, région anormale) ne s'explique pas.",
            ],
          };
        }
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}
