# Lab 4.3.1 — Gap de NetworkPolicy (trafic cross-namespace)

**Track** : Container & Kubernetes · **Module** 4.3 (Réseau Kubernetes) · **Difficulté** : intermédiaire
**Flag** : `PCE{k8s_networkpolicy_gap_2024}`

## Objectif

Auditer la segmentation réseau d'un cluster simulé et détecter un namespace
sensible qui n'applique **aucune politique `default-deny`**. Par défaut,
Kubernetes fonctionne en **allow-all** : tant qu'aucune `NetworkPolicy` ne
sélectionne un pod, tout le trafic (y compris **cross-namespace**) lui est
autorisé. Ici, le namespace `payments` héberge des pods sensibles
(`pci-vault-0`, `payments-api-5f8b`) mais ne possède aucune NetworkPolicy : un
pod compromis dans `dev` ou `prod` peut donc joindre `pci-vault` (pivot latéral).

Le namespace `prod`, lui, montre le modèle correct : une politique
`default-deny` (qui sélectionne tous les pods et n'autorise aucun ingress) plus
une politique `allow` ciblée.

## Environnement (hors-ligne)

Aucun cluster réel : un shim `kubectl` (Python) répond à partir de
`lab-data/cluster.json`. Le shim cherche le fichier dans `./cluster.json`,
`./lab-data/cluster.json`, `/srv/k8s/cluster.json` et son propre répertoire, donc
il fonctionne aussi bien sur l'hôte (pour tester) que dans le conteneur.

## Audit (détection)

```sh
kubectl get namespaces
kubectl get pods -A
kubectl get networkpolicies -A
# -> aucune NetworkPolicy dans le namespace 'payments'
```

Le namespace `prod` a `prod-default-deny-ingress` et `prod-allow-frontend-from-same-ns`.
Le namespace `payments` (sensible, label `pci=true`) n'a **rien** : il est en
allow-all.

## Solution (chemin attendu)

```sh
kubectl get networkpolicies -A
kubectl describe networkpolicy prod-default-deny-ingress   # modèle correct à imiter
kubectl audit-netpol
# [CRITIQUE] Namespace 'payments' : AUCUNE politique default-deny en ingress.
#            pod sensible exposé -> payments/pci-vault-0 ...
# FLAG: PCE{k8s_networkpolicy_gap_2024}
```

Flag : `PCE{k8s_networkpolicy_gap_2024}`.

## Remédiation

Appliquer une politique `default-deny` dans chaque namespace applicatif, puis
n'ouvrir que le trafic nécessaire via des règles `allow` ciblées (moindre
privilège réseau).

`default-deny-ingress` (et idéalement aussi l'egress) dans `payments` :

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payments-default-deny
  namespace: payments
spec:
  podSelector: {}              # sélectionne TOUS les pods du namespace
  policyTypes: ["Ingress", "Egress"]
  # aucune règle ingress/egress => tout est refusé par défaut
```

Allow ciblée (seul `payments-api` du même namespace peut joindre `pci-vault`) :

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payments-allow-api-to-vault
  namespace: payments
spec:
  podSelector:
    matchLabels: { app: pci-vault }
  policyTypes: ["Ingress"]
  ingress:
    - from:
        - podSelector:
            matchLabels: { app: payments-api }
```

Bonnes pratiques complémentaires :

- Un `default-deny` ingress **et** egress dans tous les namespaces sensibles.
- Restreindre le cross-namespace via `namespaceSelector` (jamais `from: []` vide,
  qui autorise tout).
- Auditer régulièrement (`kubectl get netpol -A`, kube-bench, outils CNI).
- Privilégier un CNI qui applique réellement les NetworkPolicies (Calico,
  Cilium) — sinon les politiques ne sont pas effectives.
