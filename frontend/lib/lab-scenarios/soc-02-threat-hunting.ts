import type { ShellScenario, ShellResult } from "@/lib/lab-shell";

/**
 * Scénario du lab 5.2.1 — Threat hunting : mouvement latéral par chaîne de rôles.
 * L'apprenant chasse une chaîne d'AssumeRole (dev-sandbox -> ci-deploy ->
 * app-backend -> db-admin) dans un export CloudTrail, identifie le rôle pivot
 * privilégié et confirme le finding pour révéler le flag.
 */
export function createScenario(): ShellScenario {
  const flag = "PCE{lateral_movement_role_chain_2024}";
  const attackerIp = "198.51.100.77";

  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 5.2.1 · Threat Hunting / Mouvement latéral (mode démo)\x1b[0m",
      "Objectif : reconstruire une chaîne d'AssumeRole et identifier le rôle pivot privilégié.",
      "Indice : l'accessKeyId temporaire rendu par un AssumeRole réalise le hop suivant (role chaining).",
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
            "  jq -r '.Records[] | \"\\(.sourceIPAddress) \\(.userAgent)\"' cloudtrail-events.json | sort | uniq -c",
            "  jq -r '.Records[] | select(.eventName==\"AssumeRole\") | \"\\(.userIdentity.userName // .userIdentity.arn) -> \\(.requestParameters.roleArn)\"' cloudtrail-events.json",
            "  jq -r '.Records[] | select(.eventName==\"AssumeRole\") | \"in=\\(.userIdentity.accessKeyId) out=\\(.responseElements.credentials.accessKeyId) role=\\(.requestParameters.roleArn)\"' cloudtrail-events.json",
            "  verify-finding db-admin",
          ],
        };
      }

      if (cmd === "ls") {
        return { lines: ["cloudtrail-events.json"] };
      }

      // Étape 1 : repérer l'acteur (IP/user-agent inhabituels).
      if (cmd.includes("sourceIPAddress") && cmd.includes("uniq")) {
        return {
          lines: [
            "      3 92.154.10.3 Mozilla/5.0 ...        (alice, légitime)",
            "      2 10.0.4.21 aws-sdk-go/1.49.0        (OIDC GitHub ci-deploy, légitime)",
            `      \x1b[33m7 ${attackerIp} Boto3 ... kali\x1b[0m  (?? user-agent 'kali')`,
            "",
            `Une IP détonne : ${attackerIp} (user-agent 'kali'). Tout part de l'utilisateur dev-sandbox.`,
          ],
        };
      }

      // Étape 2 : lister les AssumeRole pour voir les rôles cible.
      if (cmd.startsWith("jq") && cmd.includes("AssumeRole") && cmd.includes("roleArn") && !cmd.includes("accessKeyId")) {
        return {
          lines: [
            "github-oidc/run-7781 -> arn:aws:iam::123456789012:role/ci-deploy   (légitime, nightly-build)",
            "\x1b[33mdev-sandbox -> arn:aws:iam::123456789012:role/ci-deploy\x1b[0m",
            "\x1b[33mci-deploy/s3-sync -> arn:aws:iam::123456789012:role/app-backend\x1b[0m",
            "\x1b[31mapp-backend/s3-sync -> arn:aws:iam::123456789012:role/db-admin\x1b[0m",
            "",
            "Quatre AssumeRole : la chaîne malveillante part de dev-sandbox.",
          ],
        };
      }

      // Étape 3 : relier les hops via les clés temporaires (in/out).
      if (cmd.startsWith("jq") && cmd.includes("accessKeyId") && cmd.includes("AssumeRole")) {
        return {
          lines: [
            "in=ASIAGHOIDC0000LEGIT  out=ASIACIDEPLOY00LEGIT1  role=.../ci-deploy   (CI légitime)",
            "in=AKIADEVSANDBOX00PWN1 out=ASIAHOP1CIDEPLOY0001  role=.../ci-deploy",
            "in=ASIAHOP1CIDEPLOY0001 out=ASIAHOP2APPBACK00002  role=.../app-backend",
            "in=ASIAHOP2APPBACK00002 out=ASIAHOP3DBADMIN00003  role=.../db-admin",
            "",
            "\x1b[36mChaîne : dev-sandbox -> ci-deploy -> app-backend -> db-admin.\x1b[0m",
            "Le 'out' d'un hop est le 'in' du suivant. Le pivot final est db-admin.",
          ],
        };
      }

      // Confirmation du finding.
      if (cmd.startsWith("verify-finding") || cmd.includes("pceFinding")) {
        if (cmd.includes("db-admin")) {
          return {
            lines: [
              "[+] Role pivot confirme : db-admin",
              "[+] Chaine d'AssumeRole (mouvement lateral) :",
              "    dev-sandbox -> ci-deploy",
              "    ci-deploy -> app-backend",
              "    app-backend -> db-admin",
              "[+] Evenement pivot final :",
              `Mouvement lateral confirme: ... FLAG=\x1b[32m${flag}\x1b[0m`,
              "",
              "Bien joué — copiez le flag et soumettez-le à droite.",
            ],
          };
        }
        if (cmd.startsWith("verify-finding")) {
          return {
            lines: [
              "[-] Ce role n'est pas le pivot final de la chaine. Reanalysez les hops.",
              "    Astuce : suivez les accessKeyId temporaires jusqu'au role le plus privilegie.",
            ],
          };
        }
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}
