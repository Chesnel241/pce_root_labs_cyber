/** Indices détaillés (3 par challenge) — Track 3. */
export const hints: Record<string, string[]> = {
  "3.1.2": [
    "Indice 1 : un paramètre de build (par exemple `TARGET_ENV`) est repris tel quel dans un bloc `sh` du pipeline. Sans validation, l'entrée utilisateur peut devenir une commande. Commence par lire le `Jenkinsfile`.",
    "Indice 2 : si le script fait quelque chose comme `echo Deploying to $TARGET_ENV`, tu peux clore la commande prévue puis enchaîner la tienne. Pense aux séparateurs shell comme `;` pour injecter `cat /flag.txt`.",
    "Indice 3 : lance un build avec un payload malveillant, par exemple `curl -X POST http://jenkins/job/deploy/buildWithParameters -d 'TARGET_ENV=prod; cat /flag.txt'`, puis lis les logs de console du build pour récupérer le flag.",
  ],
  "3.1.3": [
    "Indice 1 : un workflow GitHub Actions a affiché un secret avec `echo` lors d'une étape de diagnostic. Les journaux d'exécution (logs) gardent une trace même quand le masquage échoue. Va voir l'onglet Actions du dépôt.",
    "Indice 2 : sélectionne le run vulnérable et télécharge l'archive complète des logs, puis décompresse-la pour pouvoir fouiller son contenu localement.",
    "Indice 3 : après `unzip logs.zip`, cherche récursivement le format du flag avec `grep -r 'PCE{' .` ; le secret imprimé en clair apparaît dans l'étape de diagnostic.",
  ],
  "3.1.4": [
    "Indice 1 : il s'agit d'un audit suivi d'un correctif. Repère d'abord les pratiques dangereuses du pipeline : secrets hardcodés ou affichés via `sh \"echo ${SECRET}\"`. Regarde le code et les différences avec `git diff`.",
    "Indice 2 : la remédiation consiste à utiliser les mécanismes sûrs de Jenkins, notamment les Jenkins Credentials et la directive `withCredentials` au lieu d'exposer les secrets en clair.",
    "Indice 3 : applique le correctif, puis valide que le build passe, que les secrets n'apparaissent plus dans les logs et que l'injection n'est plus possible : le flag de complétion s'affiche alors.",
  ],
  "3.2.2": [
    "Indice 1 : un template CloudFormation doit être audité avant déploiement. Un outil d'analyse statique peut remonter automatiquement les ressources vulnérables (ports ouverts, absence de chiffrement).",
    "Indice 2 : utilise `cfn_nag` (ou `checkov`) pour scanner le fichier, par exemple `cfn_nag_scan --input-path template.yaml`, et lis attentivement les avertissements et erreurs bloquantes.",
    "Indice 3 : les résultats pointent un `PubliclyAccessible: true` sur une instance RDS et une règle Ingress ouvrant un port critique (22 ou 3306) depuis `0.0.0.0/0` ; la détection de ces défauts valide l'audit et révèle le flag.",
  ],
  "3.2.3": [
    "Indice 1 : ce `Dockerfile` contient des pratiques dangereuses. Un linter ou un scanner de configuration peut les détecter automatiquement, comme l'exécution en root ou l'inclusion d'un secret.",
    "Indice 2 : lance un outil tel que `hadolint` ou `trivy` sur le fichier, par exemple `trivy config Dockerfile`, et examine les alertes remontées.",
    "Indice 3 : l'outil signale l'absence de directive `USER` (donc exécution en `root`) et une commande `COPY`/`ENV` qui embarque un fichier de clé privée ; identifier ces deux mauvaises pratiques valide l'exercice.",
  ],
  "3.3.2": [
    "Indice 1 : le mot de passe est passé au conteneur via une variable d'environnement. Sous Linux, l'environnement d'un processus reste lisible via le système de fichiers `/proc`.",
    "Indice 2 : le processus principal du conteneur a le PID 1. Tu peux lire son environnement avec `cat /proc/1/environ` ; remplace les séparateurs nuls par des sauts de ligne avec `tr '\\0' '\\n'` pour le rendre lisible.",
    "Indice 3 : filtre la sortie pour isoler le secret, par exemple `cat /proc/1/environ | tr '\\0' '\\n' | grep 'PASSWORD'` ; la valeur du mot de passe exposé correspond au flag.",
  ],
  "3.3.3": [
    "Indice 1 : l'objectif est de migrer les identifiants vers un service dédié plutôt que de les stocker en local. Pense à AWS Secrets Manager et aux permissions IAM nécessaires.",
    "Indice 2 : vérifie d'abord que tu peux lire le secret via l'API, en disposant de la permission `secretsmanager:GetSecretValue`, par exemple `aws secretsmanager get-secret-value --secret-id MyAppSecret --region us-east-1`.",
    "Indice 3 : modifie le code ou le script de démarrage pour appeler dynamiquement ce secret (au lieu d'une variable locale), garantissant qu'il n'est plus stocké sur disque ; la migration réussie valide le flag.",
  ],
  "3.4.2": [
    "Indice 1 : une dépendance du projet est issue d'une attaque par typosquatting : un nom presque identique à un paquet populaire (par ex. `loadsh` au lieu de `lodash`, ou `electorn` au lieu de `electron`). Inspecte la liste des dépendances.",
    "Indice 2 : utilise `npm ls` pour passer en revue les noms et détecter une anomalie d'orthographe, et complète avec `npm audit` pour voir si le paquet a déjà été signalé.",
    "Indice 3 : repère le faux paquet au nom mal orthographié et vérifie sa provenance ; l'identification de cette dépendance piégée valide l'analyse et révèle le flag.",
  ],
  "3.4.3": [
    "Indice 1 : pour garantir l'intégrité de la Supply Chain, il faut tracer les composants d'une image (SBOM) et vérifier sa signature cryptographique. Deux outils complémentaires sont attendus ici.",
    "Indice 2 : génère le SBOM avec `syft`, par exemple `syft mon-image:latest`, pour lister tous les paquets embarqués dans l'image.",
    "Indice 3 : vérifie ensuite la signature avec `cosign verify --key pub.key mon-image:latest` en utilisant la clé publique fournie ; une image correctement signée et un SBOM validé donnent le flag.",
  ],
};
