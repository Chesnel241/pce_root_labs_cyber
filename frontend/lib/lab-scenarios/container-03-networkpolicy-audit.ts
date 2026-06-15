import type { ShellScenario, ShellResult } from "@/lib/lab-shell";

/**
 * Scénario du lab 4.3.1 — Gap de NetworkPolicy (trafic cross-namespace).
 * L'apprenant audite la segmentation réseau via un kubectl simulé, repère le
 * namespace 'payments' sans default-deny, puis confirme via `kubectl audit-netpol`.
 */
export function createScenario(): ShellScenario {
  const flag = "PCE{k8s_networkpolicy_gap_2024}";

  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 4.3.1 · Gap de NetworkPolicy (mode démo)\x1b[0m",
      "Objectif : auditer la segmentation réseau et repérer le namespace sensible sans default-deny.",
      "Indice : un namespace sans NetworkPolicy = allow-all (trafic cross-namespace possible / pivot).",
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
            "  kubectl get namespaces",
            "  kubectl get pods -A",
            "  kubectl get networkpolicies -A",
            "  kubectl describe networkpolicy <name>",
            "  kubectl audit-netpol      # détecte le gap et révèle le flag",
          ],
        };
      }

      if (cmd.startsWith("kubectl get namespace")) {
        return {
          lines: [
            "NAME         LABELS",
            'kube-system  {"kubernetes.io/metadata.name":"kube-system"}',
            'prod         {"kubernetes.io/metadata.name":"prod","tier":"frontend"}',
            '\x1b[33mpayments     {"kubernetes.io/metadata.name":"payments","tier":"sensitive","pci":"true"}\x1b[0m',
            'dev          {"kubernetes.io/metadata.name":"dev","tier":"sandbox"}',
          ],
        };
      }

      if (cmd.startsWith("kubectl get pod")) {
        return {
          lines: [
            "NAMESPACE   NAME                POD-IP       LABELS",
            "prod        web-frontend-7d9c   10.20.1.11   {\"app\":\"web-frontend\"}",
            "payments    payments-api-5f8b   10.20.2.21   {\"app\":\"payments-api\"}",
            "\x1b[33mpayments    pci-vault-0         10.20.2.31   {\"app\":\"pci-vault\",\"store\":\"cardholder-data\"}\x1b[0m",
            "dev         scratch-debug-abc1  10.20.3.41   {\"app\":\"scratch-debug\"}",
          ],
        };
      }

      if (
        cmd.startsWith("kubectl get networkpolic") ||
        cmd.startsWith("kubectl get netpol")
      ) {
        return {
          lines: [
            "NAMESPACE   NAME                                POD-SELECTOR",
            "prod        prod-default-deny-ingress           <all>",
            'prod        prod-allow-frontend-from-same-ns    {"app":"web-frontend"}',
            "",
            "\x1b[33mAucune NetworkPolicy dans le namespace 'payments' (pourtant sensible, pci=true).\x1b[0m",
            "=> 'payments' est en allow-all : tout namespace peut le joindre.",
          ],
        };
      }

      if (cmd.startsWith("kubectl describe networkpolicy")) {
        if (cmd.includes("prod-default-deny-ingress")) {
          return {
            lines: [
              "Name:         prod-default-deny-ingress",
              "Namespace:    prod",
              "PodSelector:  <none> (sélectionne TOUS les pods)",
              "PolicyTypes:  Ingress",
              "Ingress:      (aucune règle)  => tout l'ingress est refusé par défaut",
              "",
              "\x1b[36mModèle 'default-deny' correct. Le namespace 'payments' n'a pas l'équivalent.\x1b[0m",
            ],
          };
        }
        if (cmd.includes("prod-allow-frontend-from-same-ns")) {
          return {
            lines: [
              "Name:         prod-allow-frontend-from-same-ns",
              "Namespace:    prod",
              'PodSelector:  app=web-frontend',
              "Ingress:      from namespaceSelector kubernetes.io/metadata.name=prod",
              "=> seuls les pods du namespace 'prod' peuvent joindre web-frontend.",
            ],
          };
        }
        return {
          lines: [
            "kubectl: networkpolicy introuvable.",
            "Essayez : kubectl describe networkpolicy prod-default-deny-ingress",
          ],
        };
      }

      if (cmd.startsWith("kubectl audit-netpol")) {
        return {
          lines: [
            "== Audit NetworkPolicy : namespaces sans default-deny (gap cross-namespace) ==",
            "",
            "\x1b[31m[CRITIQUE]\x1b[0m Namespace 'payments' : AUCUNE politique default-deny en ingress.",
            "           networkPolicies = 0  =>  modèle 'allow-all' par défaut de Kubernetes.",
            "           pod sensible exposé -> payments/pci-vault-0 (store=cardholder-data)",
            "           pod sensible exposé -> payments/payments-api-5f8b",
            "           => n'importe quel pod d'un autre namespace peut les joindre (pivot latéral).",
            "",
            "Remédiation : appliquer un NetworkPolicy default-deny puis des allow ciblées.",
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
            "Essayez : kubectl get networkpolicies -A, puis kubectl audit-netpol",
          ],
        };
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}
