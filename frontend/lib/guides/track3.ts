import { ChallengeGuide } from '../guides';

export const guides: Record<string, ChallengeGuide> = {
  '3.1.1': {
    context: "Il est fréquent de trouver des secrets en clair (hardcodés) dans des fichiers de pipeline comme le `Jenkinsfile`. Ces secrets peuvent inclure des clés API, des mots de passe ou des clés d'accès AWS, exposant ainsi l'infrastructure à quiconque a accès au dépôt de code.",
    objective: "Inspecter le fichier `Jenkinsfile` du projet pour identifier des clés d'accès AWS écrites en dur.",
    concepts: ["CI/CD Security","Hardcoded Secrets","Jenkins"],
    steps: [
      {
        title: "Recherche des secrets dans le Jenkinsfile",
        detail: "La première étape consiste à lire le contenu du fichier `Jenkinsfile` et d'y rechercher des chaînes de caractères correspondant à des identifiants AWS, typiquement commençant par `AKIA`.",
        command: "cat Jenkinsfile | grep 'AKIA'"
      },
      {
        title: "Validation de la vulnérabilité",
        detail: "En analysant le fichier, vous découvrez que les identifiants AWS sont effectivement stockés en clair. Cette clé doit être révoquée et remplacée par l'utilisation de `credentials()` dans Jenkins. Le flag correspondant à cette découverte est **PCE{...}**."
      }
    ]
  },
  '3.1.2': {
    context: "Les pipelines CI/CD permettent souvent de définir des paramètres utilisateur au lancement du build. Si ces paramètres sont passés sans validation ou nettoyage (sanitization) dans un bloc de script shell, cela peut mener à une injection de commande.",
    objective: "Exploiter un paramètre vulnérable dans un pipeline Jenkins pour exécuter une commande arbitraire et lire le contenu d'un fichier sensible.",
    concepts: ["Command Injection","Pipeline Security","Input Validation"],
    steps: [
      {
        title: "Analyse des paramètres du pipeline",
        detail: "Examinez la configuration du build (par exemple un paramètre `TARGET_ENV`). Si ce paramètre est directement utilisé dans un appel `sh`, il est potentiellement vulnérable à l'injection.",
        command: "cat Jenkinsfile"
      },
      {
        title: "Exploitation de l'injection",
        detail: "Lancez un build en fournissant une charge utile (payload) qui termine la commande prévue et injecte la vôtre. Par exemple, si le script fait `echo Deploying to $TARGET_ENV`, vous pouvez passer `prod; cat /flag.txt`.",
        command: "curl -X POST http://jenkins/job/deploy/buildWithParameters -d 'TARGET_ENV=prod; cat /flag.txt'"
      },
      {
        title: "Récupération du flag",
        detail: "Consultez les logs de console du build Jenkins. La commande injectée s'exécute et affiche le flag. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  '3.1.3': {
    context: "L'utilisation de commandes `echo` pour déboguer des workflows GitHub Actions peut provoquer la fuite de secrets dans les journaux d'exécution (logs), surtout si GitHub ne parvient pas à les masquer correctement.",
    objective: "Télécharger et analyser les logs d'un workflow GitHub Actions pour extraire un secret exposé.",
    concepts: ["GitHub Actions","Log Leakage","Secrets Management"],
    steps: [
      {
        title: "Téléchargement des logs de build",
        detail: "Naviguez vers l'interface GitHub Actions du projet, sélectionnez l'exécution (run) vulnérable, puis téléchargez l'archive complète des logs."
      },
      {
        title: "Analyse des fichiers de logs",
        detail: "Utilisez la commande `grep` pour chercher le format de flag ou un nom de variable sensible dans l'archive extraite.",
        command: "unzip logs.zip && grep -r 'PCE{' ."
      },
      {
        title: "Extraction du secret",
        detail: "L'analyse révèle que le secret a été imprimé en clair lors d'une étape de diagnostic. Le flag récupéré est **PCE{...}**."
      }
    ]
  },
  '3.1.4': {
    context: "Sécuriser un pipeline implique non seulement de trouver les failles mais aussi de mettre en œuvre des correctifs (remédiation) conformes aux bonnes pratiques de la CI/CD.",
    objective: "Auditer un pipeline Jenkins, identifier une faille de gestion de secret ou d'injection, et valider que le correctif appliqué est efficace.",
    concepts: ["Audit","Remediation","Secure Pipeline"],
    steps: [
      {
        title: "Audit du code vulnérable",
        detail: "Repérez les appels dangereux dans le pipeline, comme l'utilisation de `sh \"echo ${SECRET}\"` ou des identifiants hardcodés.",
        command: "git diff"
      },
      {
        title: "Application des correctifs",
        detail: "Modifiez le pipeline pour utiliser les mécanismes de gestion de secrets sécurisés (comme les Jenkins Credentials et la directive `withCredentials`)."
      },
      {
        title: "Validation de la sécurité",
        detail: "Vérifiez que le build passe avec le pipeline sécurisé, que les secrets n'apparaissent plus dans les logs et que l'injection n'est plus possible. Le flag de complétion est **PCE{...}**."
      }
    ]
  },
  '3.2.1': {
    context: "L'Infrastructure as Code (IaC) simplifie le déploiement cloud mais introduit des risques en cas de mauvaise configuration (ex: stockages ouverts, absence de chiffrement, groupes de sécurité trop permissifs).",
    objective: "Analyser un projet Terraform vulnérable pour identifier cinq erreurs de configuration courantes.",
    concepts: ["Terraform","IaC Security","tfsec","Misconfiguration"],
    steps: [
      {
        title: "Installation et lancement de l'outil de scan",
        detail: "Utilisez un outil d'analyse statique d'IaC comme `tfsec` ou `checkov` pour auditer le répertoire contenant les fichiers `.tf`.",
        command: "tfsec ."
      },
      {
        title: "Analyse des résultats",
        detail: "Examinez les alertes générées. Vous devriez trouver 5 problèmes majeurs (ex: S3 Public Access Block manquant, EBS non chiffré, Security Group ouvert sur 0.0.0.0/0)."
      },
      {
        title: "Validation des vulnérabilités",
        detail: "Après avoir listé et vérifié les 5 erreurs critiques dans le code, vous validez le challenge. Le flag correspondant est **PCE{...}**."
      }
    ]
  },
  '3.2.2': {
    context: "AWS CloudFormation permet de définir des ressources, mais les templates doivent être vérifiés avant déploiement pour éviter de créer des ressources vulnérables (comme des bases de données publiquement accessibles).",
    objective: "Auditer un template CloudFormation pour détecter des ports ouverts et un manque de chiffrement.",
    concepts: ["CloudFormation","cfn-nag","AWS Security"],
    steps: [
      {
        title: "Scan du template avec cfn-nag",
        detail: "L'outil `cfn_nag` (ou `checkov`) peut analyser la sécurité d'un fichier CloudFormation et remonter des avertissements ou des erreurs bloquantes.",
        command: "cfn_nag_scan --input-path template.yaml"
      },
      {
        title: "Identification des failles",
        detail: "Les résultats révèlent que le paramètre `PubliclyAccessible` est à `true` sur une instance RDS, et qu'une règle Ingress autorise un port critique (ex: 22 ou 3306) depuis n'importe où."
      },
      {
        title: "Validation de l'audit",
        detail: "La détection de ces défauts permet de corriger le template avant le déploiement. Le flag de ce défi est **PCE{...}**."
      }
    ]
  },
  '3.2.3': {
    context: "La création d'images Docker sans suivre les bonnes pratiques de sécurité entraîne des vulnérabilités, telles que l'exécution de conteneurs en tant que root et la fuite d'informations sensibles dans les couches de l'image.",
    objective: "Analyser un `Dockerfile` pour y détecter des pratiques dangereuses, comme l'utilisateur root et l'inclusion de secrets.",
    concepts: ["Docker","Container Security","Trivy","Hadolint"],
    steps: [
      {
        title: "Analyse du Dockerfile (Linting)",
        detail: "Utilisez un outil de linting comme `hadolint` ou un scanner de vulnérabilités tel que `trivy` pour auditer le `Dockerfile`.",
        command: "trivy config Dockerfile"
      },
      {
        title: "Détection des mauvaises pratiques",
        detail: "L'outil signale l'absence de directive `USER` (impliquant l'exécution en tant que `root`) et la présence d'une commande `COPY` ou `ENV` intégrant un fichier de clé privée."
      },
      {
        title: "Conclusion de l'audit",
        detail: "Ces découvertes montrent que le conteneur serait hautement vulnérable s'il était déployé. Le flag de l'exercice est **PCE{...}**."
      }
    ]
  },
  '3.3.1': {
    context: "Même si un secret a été supprimé d'un projet Git, il reste présent dans l'historique des commits. Les attaquants utilisent souvent des outils pour parcourir cet historique à la recherche d'identifiants oubliés.",
    objective: "Utiliser l'outil TruffleHog pour analyser l'historique d'un dépôt Git et découvrir une clé AWS divulguée par le passé.",
    concepts: ["Git History","Secrets Detection","TruffleHog"],
    steps: [
      {
        title: "Clonage et scan du dépôt",
        detail: "Exécutez `trufflehog` sur le répertoire local du dépôt Git afin qu'il recherche des secrets dans l'ensemble des branches et de l'historique.",
        command: "trufflehog git file://$(pwd) --only-verified"
      },
      {
        title: "Analyse des résultats",
        detail: "L'outil identifie un commit ancien où le fichier de configuration contenait une variable avec un token AWS valide ou formaté."
      },
      {
        title: "Récupération du flag",
        detail: "En inspectant le commit incriminé, vous retrouvez la clé ou le flag. Le flag attendu est **PCE{...}**."
      }
    ]
  },
  '3.3.2': {
    context: "Les conteneurs Docker reçoivent souvent leur configuration via des variables d'environnement. Si des mots de passe sont passés ainsi sans chiffrement, ils peuvent être extraits par quiconque a accès au système hôte ou au conteneur.",
    objective: "Lire l'environnement d'un processus en cours d'exécution pour en extraire un mot de passe.",
    concepts: ["Environment Variables","Container Security","Information Disclosure"],
    steps: [
      {
        title: "Accès au système de fichiers du processus",
        detail: "Dans un environnement Linux, les variables d'environnement du processus d'ID 1 (le processus principal du conteneur) sont accessibles via le système de fichiers `/proc`.",
        command: "cat /proc/1/environ | tr '\\0' '\\n'"
      },
      {
        title: "Filtrage et extraction",
        detail: "Cherchez la variable correspondant au mot de passe de la base de données ou de l'API (souvent nommée `PASSWORD` ou `DB_PASS`).",
        command: "cat /proc/1/environ | tr '\\0' '\\n' | grep 'PASSWORD'"
      },
      {
        title: "Récupération du flag",
        detail: "La valeur du mot de passe exposé s'affiche. Le flag de validation est **PCE{...}**."
      }
    ]
  },
  '3.3.3': {
    context: "Pour résoudre les problèmes de secrets codés en dur ou passés en variables d'environnement non sécurisées, l'approche recommandée consiste à utiliser un service de gestion de secrets, tel qu'AWS Secrets Manager.",
    objective: "Configurer une application pour qu'elle récupère ses identifiants à partir d'AWS Secrets Manager au lieu d'utiliser des variables locales.",
    concepts: ["Secrets Manager","AWS IAM","Secure Configuration"],
    steps: [
      {
        title: "Vérification de l'accès au secret",
        detail: "Assurez-vous que l'application ou l'utilisateur dispose des permissions IAM adéquates (`secretsmanager:GetSecretValue`) et interrogez l'API pour récupérer le secret.",
        command: "aws secretsmanager get-secret-value --secret-id MyAppSecret --region us-east-1"
      },
      {
        title: "Mise à jour de l'application",
        detail: "Modifiez le code ou le script de démarrage pour appeler dynamiquement ce secret, garantissant ainsi qu'il n'est plus stocké sur le disque."
      },
      {
        title: "Validation de la migration",
        detail: "En migrant avec succès vers AWS Secrets Manager, vous sécurisez l'accès. Le flag validant cette étape est **PCE{...}**."
      }
    ]
  },
  '3.4.1': {
    context: "Les attaques de type 'Supply Chain' ciblent souvent les gestionnaires de paquets (comme npm). Un script `postinstall` dans un paquet légitime ou compromis peut exécuter du code malveillant sur la machine du développeur lors de l'installation.",
    objective: "Identifier le script de post-installation malveillant au sein des dépendances d'un projet Node.js.",
    concepts: ["Supply Chain","npm","Malicious Packages","Postinstall Scripts"],
    steps: [
      {
        title: "Inspection du fichier package.json",
        detail: "Recherchez d'abord des paquets suspects dans les dépendances du projet.",
        command: "cat package.json"
      },
      {
        title: "Recherche de scripts postinstall",
        detail: "Explorez le répertoire `node_modules` pour trouver le script exécuté lors du `postinstall` par le paquet malveillant.",
        command: "find node_modules -name package.json -exec grep -H 'postinstall' {} \\;"
      },
      {
        title: "Analyse du comportement malveillant",
        detail: "Le script extrait des informations sensibles ou télécharge un binaire externe. La découverte de cette mécanique donne accès au flag : **PCE{...}**."
      }
    ]
  },
  '3.4.2': {
    context: "Le typosquatting repose sur l'erreur humaine : publier un paquet dont le nom est très similaire à celui d'une dépendance populaire (par exemple, `loadsh` au lieu de `lodash`) pour piéger les développeurs.",
    objective: "Détecter une dépendance issue d'une attaque par typosquatting dans un projet et vérifier sa provenance.",
    concepts: ["Typosquatting","Dependency Confusion","Supply Chain"],
    steps: [
      {
        title: "Audit des dépendances",
        detail: "Passez en revue les noms de dépendances du projet pour détecter des anomalies d'orthographe (ex: `electorn` au lieu de `electron`).",
        command: "npm ls"
      },
      {
        title: "Analyse des vulnérabilités connues",
        detail: "Vous pouvez également utiliser des outils d'audit natifs pour voir si le paquet a déjà été signalé.",
        command: "npm audit"
      },
      {
        title: "Identification du paquet piégé",
        detail: "L'identification du faux paquet permet de bloquer son utilisation. Le flag confirmant l'analyse est **PCE{...}**."
      }
    ]
  },
  '3.4.3': {
    context: "Afin de garantir l'intégrité de la Supply Chain, il est indispensable de signer les artefacts (images Docker) et de générer leur SBOM (Software Bill of Materials) pour tracer leurs composants.",
    objective: "Générer le SBOM d'une image Docker et vérifier sa signature cryptographique à l'aide de Cosign.",
    concepts: ["SBOM","Syft","Cosign","Image Signature"],
    steps: [
      {
        title: "Génération du SBOM",
        detail: "Utilisez l'outil `syft` pour lister tous les paquets logiciels embarqués dans l'image conteneurisée.",
        command: "syft mon-image:latest"
      },
      {
        title: "Vérification de la signature",
        detail: "Utilisez `cosign` avec la clé publique fournie pour vérifier que l'image n'a pas été altérée depuis sa publication.",
        command: "cosign verify --key pub.key mon-image:latest"
      },
      {
        title: "Validation de la sécurité de l'image",
        detail: "L'image est correctement signée et son SBOM est validé. Le flag correspondant est **PCE{...}**."
      }
    ]
  }
};
