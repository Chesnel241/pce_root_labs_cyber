import { ChallengeGuide } from '../guides';

export const guides: Record<string, ChallengeGuide> = {
  '3.1.1': {
    context: "Il est fréquent de trouver des secrets en clair (hardcodés) dans des fichiers de pipeline comme le `Jenkinsfile`. Ces secrets peuvent inclure des clés API, des mots de passe ou des clés d'accès AWS, exposant ainsi l'infrastructure à quiconque a accès au dépôt de code.",
    objective: "Inspecter le fichier `Jenkinsfile` et les configurations du projet pour identifier des clés d'accès AWS écrites en dur.",
    concepts: ["CI/CD Security", "Hardcoded Secrets", "Jenkins"],
    steps: [
      {
        title: "Recherche des secrets dans les artefacts du pipeline",
        detail: "La première étape consiste à lire les fichiers du job dans le répertoire `/srv/jenkins` (notamment `Jenkinsfile` et `job-config.xml`) et d'y rechercher des chaînes correspondant à des variables d'environnement AWS comme `AWS_SECRET_ACCESS_KEY`.",
        command: "grep -ri \"AWS_SECRET\" /srv/jenkins"
      },
      {
        title: "Récupération du flag",
        detail: "La recherche révèle que les identifiants AWS sont effectivement stockés en clair. La valeur de la variable d'environnement constitue le flag.\nLe flag attendu est **PCE{jenkins_plaintext_aws_creds_2024}**."
      }
    ]
  },
  '3.1.2': {
    context: "Les pipelines CI/CD permettent souvent de définir des paramètres au lancement du build. Si ces paramètres sont passés sans validation (sanitization) dans un script shell, cela peut mener à une injection de commande.",
    objective: "Exploiter un paramètre vulnérable dans un pipeline pour exécuter une commande arbitraire et lire le contenu d'un fichier sensible.",
    concepts: ["Command Injection", "Pipeline Security", "Input Validation"],
    steps: [
      {
        title: "Analyse du script de runner vulnérable",
        detail: "Examinez comment le runner traite les paramètres en entrée, comme le nom de branche, en lisant le script `/opt/ci/run-pipeline.py`.",
        command: "cat /opt/ci/run-pipeline.py"
      },
      {
        title: "Exploitation de l'injection",
        detail: "Lancez le pipeline via `sudo` en fournissant une charge utile (payload) qui échappe le contexte de la commande prévue pour injecter la vôtre. Le but est de lire le flag appartenant à l'utilisateur `ci-runner` dans `/opt/ci/flag.txt`.",
        command: "sudo -u ci-runner /opt/ci/run-pipeline.py \"main; cat /opt/ci/flag.txt\""
      },
      {
        title: "Récupération du flag",
        detail: "La commande injectée s'exécute et affiche le contenu du fichier protégé.\nLe flag attendu est **PCE{pipeline_cmd_inj_2024}**."
      }
    ]
  },
  '3.1.3': {
    context: "L'utilisation de commandes pour déboguer des workflows GitHub Actions peut provoquer la fuite de secrets dans les journaux d'exécution (logs), surtout si GitHub ne parvient pas à les masquer correctement.",
    objective: "Analyser les logs d'un workflow GitHub Actions pour extraire un secret exposé en clair.",
    concepts: ["GitHub Actions", "Log Leakage", "Secrets Management"],
    steps: [
      {
        title: "Recherche dans les logs de build",
        detail: "Utilisez la commande `grep` pour chercher le format de flag (PCE{) dans les fichiers de logs disponibles dans le répertoire `~/lab-data`.",
        command: "grep -rn \"PCE{\" ~/lab-data"
      },
      {
        title: "Extraction du secret",
        detail: "L'analyse révèle que le jeton de déploiement (Deployment Token) a été imprimé en clair lors d'une étape de diagnostic.\nLe flag récupéré est **PCE{gha_secrets_leaked_2024}**."
      }
    ]
  },
  '3.1.4': {
    context: "Sécuriser un pipeline implique non seulement de trouver les failles mais aussi de mettre en œuvre des correctifs (remédiation) conformes aux bonnes pratiques de la CI/CD.",
    objective: "Auditer un pipeline Jenkins, corriger les mauvaises pratiques et valider que le correctif appliqué est efficace.",
    concepts: ["Audit", "Remediation", "Secure Pipeline"],
    steps: [
      {
        title: "Audit du Jenkinsfile vulnérable",
        detail: "Lisez le fichier `Jenkinsfile` situé dans votre répertoire personnel pour repérer les failles (identifiants en dur, exécution en tant que root, curls non sécurisés).",
        command: "cat ~/Jenkinsfile"
      },
      {
        title: "Application des correctifs",
        detail: "Modifiez le pipeline pour appliquer les bonnes pratiques, par exemple en utilisant les `credentials()` Jenkins et des conteneurs non-privilégiés."
      },
      {
        title: "Validation de la sécurité",
        detail: "Exécutez le script de validation `./check_pipeline.py` pour vérifier que vos correctifs sont complets et robustes.",
        command: "./check_pipeline.py"
      },
      {
        title: "Récupération du flag",
        detail: "Si la validation est réussie, le script vous donnera le flag.\nLe flag de complétion est **PCE{j3nk1ns_p1p3l1n3_s3cur3d}**."
      }
    ]
  },
  '3.2.1': {
    context: "L'Infrastructure as Code (IaC) simplifie le déploiement cloud mais introduit des risques en cas de mauvaise configuration (ex: stockages ouverts, absence de chiffrement, groupes de sécurité trop permissifs).",
    objective: "Auditer un projet Terraform pour identifier cinq erreurs de configuration courantes touchant les services AWS.",
    concepts: ["Terraform", "IaC Security", "Misconfiguration"],
    steps: [
      {
        title: "Analyse manuelle du code Terraform",
        detail: "Recherchez manuellement dans `/srv/terraform/main.tf` les mauvaises configurations telles que les buckets S3 publics ou les Security Groups ouverts à tout Internet.",
        command: "grep -n \"0.0.0.0/0\" /srv/terraform/main.tf"
      },
      {
        title: "Lancement de l'audit automatique",
        detail: "Utilisez le script de validation fourni pour valider les 5 catégories de misconfigurations dans le projet.",
        command: "python3 /usr/local/bin/tf-audit.py /srv/terraform"
      },
      {
        title: "Validation des vulnérabilités",
        detail: "Après avoir détecté les erreurs avec succès, le scanner révèle le flag.\nLe flag correspondant est **PCE{terraform_five_misconfigs_2024}**."
      }
    ]
  },
  '3.2.2': {
    context: "AWS CloudFormation permet de définir des ressources, mais les templates doivent être vérifiés avant déploiement pour éviter de créer des ressources vulnérables.",
    objective: "Auditer un template CloudFormation pour détecter des ports ouverts (comme SSH global) et un manque de chiffrement (S3), puis le corriger.",
    concepts: ["CloudFormation", "Checkov", "AWS Security"],
    steps: [
      {
        title: "Scan du template avec checkov",
        detail: "Utilisez l'outil `checkov` pour analyser la sécurité du fichier `template.yaml` et remonter les erreurs bloquantes.",
        command: "checkov -f template.yaml"
      },
      {
        title: "Correction et validation",
        detail: "Après avoir corrigé le template, lancez le script de vérification local pour confirmer que les vulnérabilités sont résolues.",
        command: "./verify.py"
      },
      {
        title: "Récupération du flag",
        detail: "La détection et la correction des défauts octroie le flag.\nLe flag de ce défi est **PCE{cfn_auditing_and_securing_2026}**."
      }
    ]
  },
  '3.2.3': {
    context: "La création d'images Docker sans suivre les bonnes pratiques de sécurité entraîne des vulnérabilités, telles que la fuite d'informations sensibles ou l'utilisation par défaut de l'utilisateur root.",
    objective: "Analyser un projet contenant un `Dockerfile` pour y détecter des pratiques dangereuses et retrouver un secret fuité.",
    concepts: ["Docker", "Container Security", "Secrets in Images"],
    steps: [
      {
        title: "Analyse du Dockerfile et des sources",
        detail: "Explorez le répertoire `~/project/` pour examiner le `Dockerfile` et les fichiers sources à la recherche de mauvaises pratiques ou de secrets copiés dans l'image.",
        command: "cat ~/project/Dockerfile"
      },
      {
        title: "Recherche du secret",
        detail: "Utilisez `grep` pour trouver le flag au format `PCE{` dans les fichiers du projet.",
        command: "grep -rn \"PCE{\" ~/project/"
      },
      {
        title: "Conclusion de l'audit",
        detail: "Le flag, stocké de manière non sécurisée et intégré à l'image, a été retrouvé.\nLe flag de l'exercice est **PCE{d0ck3rf1l3_s3cr3t_l34k_2024}**."
      }
    ]
  },
  '3.3.1': {
    context: "Même si un secret a été supprimé d'un projet Git, il reste présent dans l'historique des commits. Les attaquants utilisent souvent des outils pour parcourir cet historique à la recherche d'identifiants oubliés.",
    objective: "Inspecter l'historique d'un dépôt Git pour retrouver un secret (clé AWS) qui a été commité par le passé puis supprimé.",
    concepts: ["Git History", "Secrets Detection", "TruffleHog"],
    steps: [
      {
        title: "Recherche dans l'historique de Git",
        detail: "Utilisez les commandes Git natives ou un outil spécialisé pour fouiller l'historique complet (toutes les branches) à la recherche du secret.",
        command: "cd ~/pce-billing-api && git log --all -p | grep -n \"AWS_SECRET_ACCESS_KEY\""
      },
      {
        title: "Extraction du flag direct",
        detail: "Vous pouvez également chercher directement la chaîne `PCE{` pour identifier le commit incriminé.",
        command: "cd ~/pce-billing-api && git log --all -p | grep \"PCE{\""
      },
      {
        title: "Récupération du flag",
        detail: "En inspectant le commit incriminé, vous retrouvez la clé AWS qui sert de flag.\nLe flag attendu est **PCE{git_history_leaked_aws_key_2024}**."
      }
    ]
  },
  '3.3.2': {
    context: "Les conteneurs Docker reçoivent souvent leur configuration via des variables d'environnement. Si des mots de passe sont passés ainsi, ils peuvent être extraits par quiconque a accès au système hôte ou peut exécuter un shell dans le conteneur.",
    objective: "Lire l'environnement d'un processus en cours d'exécution pour en extraire un mot de passe sensible.",
    concepts: ["Environment Variables", "Container Security", "Information Disclosure"],
    steps: [
      {
        title: "Affichage de l'environnement",
        detail: "Dans le shell du conteneur fourni, affichez les variables d'environnement en utilisant la commande appropriée.",
        command: "env"
      },
      {
        title: "Filtrage et extraction",
        detail: "L'affichage direct révèle la variable d'environnement contenant le mot de passe de la base de données.\nLe flag de validation est **PCE{env_v4r_s3cr3t_2026}**."
      }
    ]
  },
  '3.3.3': {
    context: "Pour résoudre les problèmes de secrets codés en dur, l'approche recommandée consiste à utiliser un service de gestion de secrets comme AWS Secrets Manager.",
    objective: "Mettre à jour le code d'une application (app.py) pour utiliser `boto3` et AWS Secrets Manager, afin de supprimer un mot de passe écrit en dur.",
    concepts: ["Secrets Manager", "Boto3", "Secure Configuration"],
    steps: [
      {
        title: "Modification de l'application",
        detail: "Ouvrez `app.py` et remplacez la chaîne en dur par un appel à AWS Secrets Manager en utilisant le client `boto3` et la méthode `get_secret_value(SecretId='prod/db/password')`."
      },
      {
        title: "Validation de la migration",
        detail: "Lancez le script de validation pour vous assurer que le fichier source n'expose plus le mot de passe et fonctionne correctement.",
        command: "./verify.sh"
      },
      {
        title: "Récupération du flag",
        detail: "En migrant avec succès vers AWS Secrets Manager, vous validez l'étape.\nLe flag validant cette étape est **PCE{migrated_to_secrets_manager_2024}**."
      }
    ]
  },
  '3.4.1': {
    context: "Les attaques de type 'Supply Chain' ciblent souvent les gestionnaires de paquets (comme npm). Un paquet malveillant installé par erreur peut utiliser un script `postinstall` pour exécuter du code à l'insu du développeur.",
    objective: "Auditer les dépendances d'un projet Node.js pour identifier un script de post-installation malveillant introduit par typosquatting.",
    concepts: ["Supply Chain", "npm", "Typosquatting", "Postinstall Scripts"],
    steps: [
      {
        title: "Recherche de scripts postinstall",
        detail: "Explorez le répertoire `/srv/app/node_modules` pour trouver les paquets définissant un script `postinstall` dans leur fichier `package.json`.",
        command: "grep -rn \"postinstall\" /srv/app/node_modules/*/package.json"
      },
      {
        title: "Analyse du comportement malveillant",
        detail: "Utilisez le script d'audit automatique pour lister et remonter la charge utile désarmée, qui contient un marqueur de compromission.",
        command: "python3 /usr/local/bin/npm-audit.py /srv/app"
      },
      {
        title: "Récupération du flag",
        detail: "L'outil d'audit ou l'examen manuel des fichiers suspects donne accès au marqueur caché.\nLe flag est **PCE{npm_typosquat_postinstall_2024}**."
      }
    ]
  },
  '3.4.2': {
    context: "Le typosquatting repose sur l'erreur humaine : publier un paquet dont le nom est très similaire à celui d'une dépendance populaire (par exemple `pyamal` au lieu de `pyyaml`) pour piéger les développeurs.",
    objective: "Détecter une dépendance issue d'une attaque par typosquatting dans un projet Python et analyser son code source dans l'environnement virtuel (.venv).",
    concepts: ["Typosquatting", "Python", "Supply Chain"],
    steps: [
      {
        title: "Audit des dépendances",
        detail: "Passez en revue le fichier des dépendances du projet pour repérer des fautes de frappe.",
        command: "cat /home/analyst/app/project/src/requirements.txt"
      },
      {
        title: "Identification du paquet piégé et analyse",
        detail: "Examinez le code de la fausse dépendance installée dans l'environnement virtuel local (`.venv`) pour y retrouver le code malveillant ou le flag caché.",
        command: "cat /home/analyst/app/lab-data/.venv/lib/python3.12/site-packages/pyamal/__init__.py"
      },
      {
        title: "Récupération du flag",
        detail: "L'inspection du code source malveillant livre le flag.\nLe flag confirmant l'analyse est **PCE{typ0squatt1ng_busted}**."
      }
    ]
  },
  '3.4.3': {
    context: "Afin de garantir l'intégrité de la Supply Chain, il est indispensable de scanner les vulnérabilités embarquées via un SBOM (Software Bill of Materials) et de vérifier les signatures cryptographiques des artefacts.",
    objective: "Inspecter un fichier SBOM pour y trouver une information cachée, et valider la signature de l'image Docker avec l'outil Cosign.",
    concepts: ["SBOM", "Cosign", "Image Signature"],
    steps: [
      {
        title: "Recherche dans le SBOM",
        detail: "Fouillez le fichier `sbom.json` pour y trouver la première moitié du flag, potentiellement dissimulée dans les métadonnées de version d'un composant vulnérable.",
        command: "grep -i \"pce\" sbom.json"
      },
      {
        title: "Vérification de la signature de l'image",
        detail: "Utilisez `cosign` avec la clé publique fournie (`cosign.pub`) pour vérifier que l'image `registry.local/myapp:v1.0` n'a pas été altérée. Cette étape affichera la seconde partie du flag.",
        command: "cosign verify --key cosign.pub registry.local/myapp:v1.0"
      },
      {
        title: "Validation de la sécurité de l'image",
        detail: "En concaténant les deux parties découvertes, vous obtenez le flag final.\nLe flag correspondant est **PCE{sbom_and_signatures_secured_2026}**."
      }
    ]
  }
};
