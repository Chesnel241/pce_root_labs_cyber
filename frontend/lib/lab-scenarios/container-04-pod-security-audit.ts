import type { ShellScenario, ShellResult } from "@/lib/lab-shell";

/**
 * Scénario du lab 4.4.1 — Pods en root / privileged (Pod Security).
 * L'apprenant audite les securityContext des pods via un kubectl simulé, repère
 * les contrevenants (root, privileged, SYS_ADMIN, hostPath), puis confirme via
 * `kubectl audit-podsecurity`.
 */
export function createScenario(): ShellScenario {
  const flag = "PCE{k8s_pods_run_as_root_2024}";

  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 4.4.1 · Pods en root / privileged (mode démo)\x1b[0m",
      "Objectif : auditer les securityContext et lister les pods qui violent les Pod Security Standards.",
      "Indice : repérez privileged=true, runAsUser 0/root, capability SYS_ADMIN, montage hostPath.",
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
            "  kubectl get pods -A",
            "  kubectl describe pod <name>",
            "  kubectl audit-podsecurity   # liste les pods fautifs et révèle le flag",
          ],
        };
      }

      if (cmd.startsWith("kubectl get pod")) {
        return {
          lines: [
            "NAMESPACE    NAME                PRIVILEGED  RUNASUSER  HOSTPATH",
            "prod         web-frontend-7d9c   False       10001      no",
            "\x1b[33mprod         legacy-api-6b5f     False       0/root     no\x1b[0m",
            "\x1b[31mmonitoring   node-agent-xk21     True        ?          yes\x1b[0m",
            "\x1b[31mdev          debug-shell-aa90    False       0/root     yes\x1b[0m",
            "\x1b[33mprod         cache-redis-0       False       ?          no\x1b[0m",
            "",
            "Le pod web-frontend est conforme (runAsUser 10001). Les autres sont à inspecter.",
          ],
        };
      }

      if (cmd.startsWith("kubectl describe pod")) {
        if (cmd.includes("node-agent-xk21")) {
          return {
            lines: [
              "Name:        node-agent-xk21",
              "Namespace:   monitoring",
              "Container 'agent':",
              "  \x1b[31mprivileged: true\x1b[0m",
              "  \x1b[31mcapabilities.add: [SYS_ADMIN, NET_ADMIN]\x1b[0m",
              "Volumes:",
              "  \x1b[31mhost-root -> hostPath: / (Directory)\x1b[0m",
              "=> évasion de conteneur triviale : accès complet au nœud.",
            ],
          };
        }
        if (cmd.includes("debug-shell-aa90")) {
          return {
            lines: [
              "Name:        debug-shell-aa90",
              "Namespace:   dev",
              "  \x1b[31mhostPID: true\x1b[0m",
              "Container 'shell':",
              "  \x1b[31mrunAsUser: 0 (root)\x1b[0m",
              "  \x1b[31mallowPrivilegeEscalation: true\x1b[0m",
              "  \x1b[31mcapabilities.add: [SYS_ADMIN]\x1b[0m",
              "Volumes:",
              "  \x1b[31mdocker-sock -> hostPath: /var/run/docker.sock\x1b[0m",
            ],
          };
        }
        if (cmd.includes("legacy-api-6b5f")) {
          return {
            lines: [
              "Name:        legacy-api-6b5f",
              "Namespace:   prod",
              "Container 'api':",
              "  \x1b[33mrunAsUser: 0 (root)\x1b[0m  — aucun runAsNonRoot.",
            ],
          };
        }
        if (cmd.includes("web-frontend-7d9c")) {
          return {
            lines: [
              "Name:        web-frontend-7d9c",
              "Namespace:   prod",
              "  \x1b[32mrunAsNonRoot: true, runAsUser: 10001\x1b[0m",
              "Container 'web':",
              "  \x1b[32mallowPrivilegeEscalation: false, readOnlyRootFilesystem: true\x1b[0m",
              "  \x1b[32mcapabilities.drop: [ALL]\x1b[0m",
              "=> modèle durci conforme (rien à corriger).",
            ],
          };
        }
        return {
          lines: [
            "kubectl: pod introuvable.",
            "Essayez : kubectl describe pod node-agent-xk21",
          ],
        };
      }

      if (cmd.startsWith("kubectl audit-podsecurity")) {
        return {
          lines: [
            "== Audit Pod Security : pods violant les Pod Security Standards ==",
            "",
            "\x1b[31m[CRITIQUE]\x1b[0m prod/legacy-api-6b5f",
            "           - conteneur 'api': s'exécute en root (runAsNonRoot non garanti)",
            "\x1b[31m[CRITIQUE]\x1b[0m monitoring/node-agent-xk21",
            "           - conteneur 'agent': privileged=true",
            "           - conteneur 'agent': capabilities ajoutées [SYS_ADMIN, NET_ADMIN]",
            "           - montage hostPath '/' (accès au FS du nœud)",
            "\x1b[31m[CRITIQUE]\x1b[0m dev/debug-shell-aa90",
            "           - hostPID=true (partage l'espace de processus du nœud)",
            "           - conteneur 'shell': s'exécute en root + allowPrivilegeEscalation=true",
            "           - conteneur 'shell': capabilities ajoutées [SYS_ADMIN]",
            "           - montage hostPath '/var/run/docker.sock'",
            "\x1b[31m[CRITIQUE]\x1b[0m prod/cache-redis-0",
            "           - conteneur 'redis': s'exécute en root (runAsNonRoot non garanti)",
            "",
            "Total : 4 pod(s) non conforme(s) sur 5.",
            "Remédiation : runAsNonRoot, drop ALL, pas de privileged/hostPath, Pod Security Admission.",
            "",
            `FLAG: \x1b[32m${flag}\x1b[0m`,
            "",
            "Bien joué — copiez ce flag et soumettez-le à droite.",
          ],
        };
      }

      if (cmd.startsWith("kubectl")) {
        return {
          lines: [
            "Essayez : kubectl get pods -A, puis kubectl audit-podsecurity",
          ],
        };
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}
