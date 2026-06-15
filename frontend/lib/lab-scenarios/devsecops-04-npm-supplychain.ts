import type { ShellScenario, ShellResult } from "@/lib/lab-shell";

/**
 * Scénario du lab 3.4.1 — supply chain npm (dépendance typosquattée).
 *
 * L'apprenant inspecte package.json, repère le typosquat (crossenv vs
 * cross-env), lit le script postinstall malveillant (inerte) puis confirme via
 * grep / npm-audit.py. Le flag est le marqueur laissé dans la charge utile.
 */
export function createScenario(): ShellScenario {
  const flag = "PCE{npm_typosquat_postinstall_2024}";

  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 3.4.1 · Supply chain npm (mode démo)\x1b[0m",
      "Objectif : auditer pce-checkout-service et détecter une dépendance typosquattée à script postinstall malveillant.",
      "Indice : comparez les noms de dépendances (cross-env vs crossenv) puis cherchez les scripts postinstall.",
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
            "  cat package.json",
            "  grep -rn 'postinstall' node_modules/*/package.json",
            "  cat node_modules/crossenv/package.json",
            "  cat node_modules/crossenv/package-setup.js",
            "  grep -rn 'PCE{' node_modules/",
            "  python3 npm-audit.py .                  (scanner -> flag)",
          ],
        };
      }

      if (cmd === "ls") {
        return { lines: ["package.json  package-lock.json  .npm-allowlist.txt  node_modules  src  npm-audit.py  README.md"] };
      }

      if (cmd.startsWith("cat") && cmd.includes("package.json") && !cmd.includes("crossenv")) {
        return {
          lines: [
            '  "dependencies": {',
            '    "express": "4.19.2",',
            '    "dotenv": "16.4.5",',
            '    "stripe": "15.12.0",',
            '    "cross-env": "7.0.3",',
            '    \x1b[33m"crossenv": "6.0.3",\x1b[0m   <- typosquat (proche de cross-env)',
            '    "lodash": "4.17.21"',
            "  }",
            "",
            "Deux noms quasi identiques : cross-env (légitime) et crossenv (suspect).",
          ],
        };
      }

      if (cmd.startsWith("grep") && cmd.includes("postinstall")) {
        return {
          lines: [
            'node_modules/crossenv/package.json:  \x1b[31m"postinstall": "node ./package-setup.js"\x1b[0m',
            "",
            "Seul crossenv déclare un script postinstall (exécuté à npm install).",
          ],
        };
      }

      if (cmd.startsWith("cat") && cmd.includes("crossenv/package.json")) {
        return {
          lines: [
            '{',
            '  "name": "crossenv",',
            '  "version": "6.0.3",',
            '  "scripts": {',
            '    \x1b[31m"postinstall": "node ./package-setup.js"\x1b[0m',
            "  }",
            "}",
            "",
            "Lisez le script lancé : cat node_modules/crossenv/package-setup.js",
          ],
        };
      }

      if (cmd.startsWith("cat") && cmd.includes("package-setup.js")) {
        return {
          lines: [
            "// CHARGE UTILE MALVEILLANTE (INERTE / À LIRE)",
            "var stolen = {",
            "  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,",
            "  npmToken: process.env.NPM_TOKEN,",
            "  stripeKey: process.env.STRIPE_SECRET_KEY",
            "};",
            `// FLAG = \x1b[32m${flag}\x1b[0m`,
            "// var EXFIL_URL = 'https://npm-telemetry-collector.evil.example/collect';",
            "",
            "Le marqueur PCE{...} est le flag. (L'exfil réseau est commentée -> inerte.)",
          ],
        };
      }

      if (cmd.startsWith("grep") && cmd.includes("PCE{")) {
        return {
          lines: [
            `node_modules/crossenv/package-setup.js:// FLAG = \x1b[32m${flag}\x1b[0m`,
            "",
            "Bien joué — copiez le flag et soumettez-le à droite.",
          ],
        };
      }

      if (cmd.includes("npm-audit.py")) {
        return {
          lines: [
            "=== Audit supply chain npm (offline) — pce-checkout-service ===",
            "  \x1b[31m[ALERTE]\x1b[0m Paquet HORS allowlist : crossenv@6.0.3 (typosquat)",
            "  \x1b[31m[ALERTE]\x1b[0m crossenv : \"postinstall\": \"node ./package-setup.js\"",
            "",
            "  \x1b[31m[CRITIQUE]\x1b[0m Dependance typosquattee MALVEILLANTE confirmee :",
            "             crossenv (hors allowlist) execute un postinstall a l'install.",
            "",
            `  Drapeau du lab : \x1b[32m${flag}\x1b[0m`,
            "",
            "Bien joué — copiez le flag et soumettez-le à droite.",
          ],
        };
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}
