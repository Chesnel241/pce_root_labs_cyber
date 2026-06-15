# Lab 4.4.1 — Pods en root / privileged (Pod Security)

**Track** : Container & Kubernetes · **Module** 4.4 (Sécurité des pods) · **Difficulté** : intermédiaire
**Flag** : `PCE{k8s_pods_run_as_root_2024}`

## Objectif

Auditer le `securityContext` des pods d'un cluster simulé et identifier ceux qui
violent les **Pod Security Standards** (profil `restricted`) :

- exécution en **root** (`runAsUser: 0` ou `runAsNonRoot` non garanti),
- mode **`privileged: true`**,
- ajout de **capabilities dangereuses** (`SYS_ADMIN`, `NET_ADMIN`...),
- **`allowPrivilegeEscalation: true`**,
- montage **`hostPath`** (accès au système de fichiers du nœud),
- **`hostPID`/`hostNetwork`/`hostIPC`**.

Ces configurations permettent une évasion de conteneur ou la compromission du
nœud sous-jacent. Un seul pod (`web-frontend-7d9c`) est durci correctement et
sert de modèle.

## Environnement (hors-ligne)

Aucun cluster réel : un shim `kubectl` (Python) répond à partir de
`lab-data/pods.json`. Le shim cherche le fichier dans `./pods.json`,
`./lab-data/pods.json`, `/srv/k8s/pods.json` et son propre répertoire, donc il
fonctionne aussi bien sur l'hôte (pour tester) que dans le conteneur.

## Audit (détection)

```sh
kubectl get pods -A
# NAMESPACE   NAME              PRIVILEGED  RUNASUSER  HOSTPATH
# prod        web-frontend-7d9c False       10001      no       <- conforme
# prod        legacy-api-6b5f   False       0/root     no       <- root
# monitoring  node-agent-xk21   True        ?          yes      <- privileged + hostPath /
# dev         debug-shell-aa90  False       0/root     yes      <- root + SYS_ADMIN + docker.sock
# prod        cache-redis-0     False       ?          no       <- runAsNonRoot non garanti
```

## Solution (chemin attendu)

```sh
kubectl get pods -A
kubectl describe pod node-agent-xk21      # privileged + SYS_ADMIN + hostPath '/'
kubectl describe pod debug-shell-aa90     # root + SYS_ADMIN + hostPID + docker.sock
kubectl audit-podsecurity
# [CRITIQUE] monitoring/node-agent-xk21
#            - conteneur 'agent': privileged=true
#            - montage hostPath '/' (acces au FS du noeud)
#            ...
# FLAG: PCE{k8s_pods_run_as_root_2024}
```

Flag : `PCE{k8s_pods_run_as_root_2024}`.

## Remédiation

Définir un `securityContext` durci sur chaque pod/conteneur (modèle
`restricted`) :

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: legacy-api
  namespace: prod
spec:
  securityContext:
    runAsNonRoot: true          # interdit l'exécution en root
    runAsUser: 10001
    seccompProfile: { type: RuntimeDefault }
  containers:
    - name: api
      image: registry.pce.local/legacy-api:0.4.0
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        privileged: false       # jamais privileged
        capabilities:
          drop: ["ALL"]         # retirer toutes les capabilities Linux
  # pas de hostPath / hostPID / hostNetwork
  volumes: []
```

Mesures complémentaires :

- `runAsNonRoot: true` et un UID non-zéro explicite ; construire des images
  dont le process tourne en non-root.
- `capabilities.drop: ["ALL"]`, n'ajouter que le strict nécessaire (jamais
  `SYS_ADMIN`).
- Supprimer les montages `hostPath` (surtout `/`, `/var/run/docker.sock`) et les
  partages `hostPID/hostNetwork/hostIPC`.
- Appliquer le **Pod Security Admission** au niveau namespace pour bloquer les
  pods non conformes à l'admission :

  ```sh
  kubectl label namespace prod \
    pod-security.kubernetes.io/enforce=restricted \
    pod-security.kubernetes.io/warn=restricted
  ```

- Compléter avec un contrôleur de politiques (Kyverno, OPA/Gatekeeper) et un
  scan régulier (kube-bench, kubescape).
