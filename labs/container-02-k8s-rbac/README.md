# Lab 4.2.1 — ClusterRoleBinding trop permissif

**Track** : Container & Kubernetes · **Module** 4.2 (Kubernetes RBAC) · **Difficulté** : difficile
**Flag** : `PCE{k8s_clusteradmin_binding_2024}`

## Objectif

Un `ClusterRoleBinding` accorde le rôle `cluster-admin` (verbs `*`, resources
`*`, apiGroups `*`) à un `ServiceAccount` applicatif (`ci/ci-bot`). Un pod
compromis utilisant ce SA contrôlerait l'intégralité du cluster. Repérez la
liaison fautive.

## Environnement (hors-ligne)

Aucun cluster réel : un shim `kubectl` (Python) répond à partir de
`lab-data/cluster.json`.

## Solution (chemin attendu)

```sh
kubectl get clusterrolebindings
# -> ci-bot-cluster-admin  ClusterRole/cluster-admin  ServiceAccount/ci-bot (ns=ci)
kubectl describe clusterrolebinding ci-bot-cluster-admin
kubectl audit-rbac
# [CRITIQUE] ClusterRoleBinding 'ci-bot-cluster-admin' ... FLAG: PCE{...}
```

Flag : `PCE{k8s_clusteradmin_binding_2024}`.

## Remédiation

- Supprimer/remplacer la liaison `cluster-admin` par un `Role`/`ClusterRole`
  au moindre privilège (verbes et ressources strictement nécessaires).
- Réserver `cluster-admin` aux humains administrateurs, jamais à un SA applicatif.
- Activer un audit RBAC régulier (ex. `kubectl auth can-i --list`, kube-bench).
