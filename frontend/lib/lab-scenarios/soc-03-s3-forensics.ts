import type { ShellScenario, ShellResult } from "@/lib/lab-shell";

/**
 * Scénario du lab 5.3.2 — Forensics S3 : quel acteur a exfiltré quel objet.
 * L'apprenant croise un journal d'accès S3 et un export CloudTrail pour
 * déterminer que le compte de service 'svc-reporting' a exfiltré
 * exports/customers-full.csv (~48 Mo) depuis une IP/region anormales, puis
 * confirme le finding pour révéler le flag.
 */
export function createScenario(): ShellScenario {
  const flag = "PCE{s3_forensics_exfil_actor_2024}";
  const actor = "svc-reporting";
  const object = "exports/customers-full.csv";

  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 5.3.2 · Forensics S3 / Exfiltration (mode démo)\x1b[0m",
      "Objectif : croiser s3-access.log et cloudtrail-events.json pour trouver QUI a exfiltré QUOI.",
      "Indice : l'objet exfiltré est de loin le plus volumineux, lu par un compte de service depuis une IP externe.",
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
            "  awk '$8 ~ /GET.OBJECT/ {print $15, $6, $9}' s3-access.log | sort -rn",
            "  jq -r '.Records[] | select(.eventName==\"GetObject\") | \"\\(.userIdentity.userName) \\(.awsRegion) \\(.sourceIPAddress) \\(.requestParameters.key)\"' cloudtrail-events.json",
            "  grep pceFinding cloudtrail-events.json",
            "  verify-finding svc-reporting",
            "Note : le timestamp [date heure] occupe 2 champs awk (principal=$6, clé=$9, bytes_sent=$15).",
          ],
        };
      }

      if (cmd === "ls") {
        return { lines: ["s3-access.log  cloudtrail-events.json"] };
      }

      // Étape 1 : journal d'accès S3, téléchargements triés par volume.
      if (cmd.startsWith("awk") && cmd.includes("GET.OBJECT")) {
        return {
          lines: [
            `48210334 user/${actor} ${object}        \x1b[31m<- 48 Mo, anormal\x1b[0m`,
            "184221   user/alice exports/report-2024-05.pdf",
            "184221   user/alice exports/report-2024-05.pdf",
            "2150     user/alice public/index.html",
            "",
            `L'objet ${object} (~48 Mo de PII) ressort, lu par ${actor}.`,
          ],
        };
      }

      // Étape 2 : corrélation CloudTrail (acteur / région / IP / objet).
      if (cmd.startsWith("jq") && cmd.includes("GetObject")) {
        return {
          lines: [
            "alice eu-west-3 92.154.10.3 exports/report-2024-05.pdf        (légitime)",
            `\x1b[31m${actor} us-east-1 203.0.113.66 ${object}\x1b[0m`,
            "alice eu-west-3 92.154.10.3 exports/report-2024-05.pdf        (légitime)",
            "",
            `\x1b[36m${actor} est un compte de service interne (eu-west-3) : ici il lit des PII depuis us-east-1 / 203.0.113.66 (kali). Anormal.\x1b[0m`,
          ],
        };
      }

      // Confirmation du finding.
      if (cmd.startsWith("verify-finding") || cmd.includes("pceFinding")) {
        if (cmd.includes(actor)) {
          return {
            lines: [
              `[+] Acteur d'exfiltration confirme : ${actor}`,
              `[+] Objet exfiltre : ${object}`,
              "[+] Correlation journal d'acces S3 + CloudTrail (GetObject, 48 Mo, IP externe).",
              "[+] Finding :",
              `Exfiltration confirmee: ... FLAG=\x1b[32m${flag}\x1b[0m`,
              "",
              "Bien joué — copiez le flag et soumettez-le à droite.",
            ],
          };
        }
        if (cmd.startsWith("verify-finding")) {
          return {
            lines: [
              "[-] Ce principal n'est pas l'acteur de l'exfiltration. Reanalysez les logs.",
              "    Astuce : cherchez le plus gros REST.GET.OBJECT et croisez-le avec CloudTrail.",
            ],
          };
        }
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}
